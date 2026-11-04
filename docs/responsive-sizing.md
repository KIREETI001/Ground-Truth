# Reference-sized responsive layout

The latest visual reference supersedes the earlier blanket 150% enlargement. app/responsive.css is the final sizing authority, imported after component styles. The old enlargement has been removed from the app styles and rem baseline.

The dashboard uses a 256px desktop rail, a 64px top bar, a centered content area up to 1120px, 16px reading text, 14–15px controls/navigation, 12–13px supporting labels, 24px section headings and 20px subheadings. Code uses 14px monospace text with its own scroll surface. Desktop cards and rows use consistent spacing and compact controls. Repository owners and names use separate lines to avoid arbitrary word breaks.

The left collection and main activity scroll independently. At phone widths the collection collapses, the rail becomes full width, the header accommodates the horizontal stage navigation, and forms retain 16px input text. Tables/code scroll inside their containers rather than overflowing the page. Standard zoom, keyboard focus, reduced motion, hint movement/resizing, and class enrollment remain supported.

The landing retains its wider story and narrower authentication rail on desktop, with Student/Teacher cards outside the auth card and the requested “Let AI Cook, Know the Recepie” heading. It uses the same compact reading scale, with an appropriately larger marketing headline, and stacks on narrower windows. Login permissions remain determined by the authenticated profile.
