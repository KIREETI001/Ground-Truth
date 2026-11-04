import type { RuntimeConfig } from '../contracts.ts';
import { platformRole } from '../server/access.ts';
import { ApiError } from '../server/http.ts';
import type { SharedLearner, StudyExercise, StudyProject, StudyReviewEvidence, StudyReviewSummary, TeacherReview } from './types.ts';

export type ReviewFilter = 'needs-review'|'reviewed'|'all';
export const reviewLevelLabel:Record<TeacherReview['level'],string>={
 insufficient:'Evidence is insufficient',supported:'Needs guided support',
 explained:'Explains the reasoning in this task',transferred:'Demonstrates transfer on this task',
};

export function summarizeReviewEvidence(project:Pick<StudyProject,'exercises'>):StudyReviewSummary {
 const submitted=project.exercises.filter(ex=>ex.status==='submitted');
 const reviewed=submitted.filter(ex=>ex.reviews.length>0);
 const latest=(dates:(string|null|undefined)[])=>dates.filter((date):date is string=>!!date).sort().at(-1)||null;
 return {submitted:submitted.length,needsReview:submitted.length-reviewed.length,reviewed:reviewed.length,
  lastSubmittedAt:latest(submitted.map(ex=>ex.submittedAt)),lastReviewedAt:latest(reviewed.flatMap(ex=>ex.reviews.map(review=>review.createdAt)))};
}

export function exercisesForReview(project:Pick<StudyProject,'exercises'>,filter:ReviewFilter):StudyExercise[] {
 return project.exercises.filter(ex=>filter==='all'||(ex.status==='submitted'&&(filter==='reviewed'?ex.reviews.length>0:ex.reviews.length===0)));
}

export function projectsForReview(projects:StudyProject[],filter:ReviewFilter):StudyProject[] {
 return filter==='all'?projects:projects.filter(project=>project.reviewSummary
  ?(filter==='needs-review'?project.reviewSummary.needsReview:project.reviewSummary.reviewed)>0
  :exercisesForReview(project,filter).length>0);
}

export type TeacherProjectEvidence={learner:SharedLearner;reviewEvidenceByExercise:Record<string,StudyReviewEvidence>};

/**
 * Call only for the teacher view, then merge by exercise ID. This helper also
 * rechecks access, so a learner/other teacher cannot obtain identity or keys by
 * passing a project ID. Nothing private is returned for an uncommitted attempt.
 */
export async function loadTeacherProjectEvidence(c:RuntimeConfig,projectId:string,teacherId:string):Promise<TeacherProjectEvidence> {
 if(await platformRole(c,teacherId)!=='teacher')throw new ApiError(403,'TEACHER_REQUIRED');
 const pilot=c.PILOT_ID||'groundtruth-pilot.v1',at=new Date().toISOString();
 const project=await c.DB.prepare('SELECT p.owner_id,profile.display_name FROM study_projects p LEFT JOIN account_profiles profile ON profile.user_id=p.owner_id AND profile.pilot_id=p.pilot_id WHERE p.id=? AND p.teacher_id=? AND p.pilot_id=? AND p.expires_at>?')
  .bind(projectId,teacherId,pilot,at).first<{owner_id:string;display_name:string|null}>();
 if(!project)throw new ApiError(404,'PROJECT_NOT_FOUND');
 const classes=await c.DB.prepare('SELECT DISTINCT x.name FROM class_enrollments e JOIN teacher_classes x ON x.id=e.class_id WHERE e.student_id=? AND x.teacher_id=? AND x.pilot_id=? ORDER BY x.name')
  .bind(project.owner_id,teacherId,pilot).all<{name:string}>();
 const exercises=await c.DB.prepare("SELECT e.id,e.rubric_json,(SELECT count(*) FROM study_events activity WHERE activity.project_id=e.project_id AND activity.kind='assistance-requested' AND activity.created_at>=e.created_at AND activity.created_at<=e.submitted_at) AS guidanceRequests FROM study_exercises e JOIN study_projects p ON p.id=e.project_id WHERE p.id=? AND p.teacher_id=? AND p.pilot_id=? AND p.expires_at>? AND e.status='submitted' AND e.ended_at IS NULL AND e.submitted_at IS NOT NULL ORDER BY CASE WHEN NOT EXISTS(SELECT 1 FROM study_reviews r WHERE r.exercise_id=e.id) THEN 0 ELSE 1 END,e.created_at DESC,e.rowid DESC LIMIT 100")
  .bind(projectId,teacherId,pilot,at).all<{id:string;rubric_json:string;guidanceRequests:number}>();
 const reviewEvidenceByExercise:Record<string,StudyReviewEvidence>={};
 for(const ex of exercises.results){
  let rubric:unknown;try{rubric=JSON.parse(ex.rubric_json);}catch{rubric=null;}
  const data=rubric&&typeof rubric==='object'&&!Array.isArray(rubric)?rubric as Record<string,unknown>:null;
  const points=Array.isArray(rubric)?rubric:data?.reviewPoints;
  const mcq=data?.mcq&&typeof data.mcq==='object'?data.mcq as Record<string,unknown>:null;
  reviewEvidenceByExercise[ex.id]={reviewPoints:Array.isArray(points)?points.filter((point):point is string=>typeof point==='string'):[],guidanceRequests:Number(ex.guidanceRequests)||0,
   ...(typeof mcq?.correctOption==='string'&&['A','B','C','D'].includes(mcq.correctOption)?{suggestedOption:mcq.correctOption}:{}),
   ...(typeof mcq?.answerExplanation==='string'?{suggestedRationale:mcq.answerExplanation}:{})};
 }
 return {learner:{displayName:project.display_name?.trim()||'Shared learner',classNames:classes.results.map(item=>item.name)},reviewEvidenceByExercise};
}
