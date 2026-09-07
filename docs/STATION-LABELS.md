# Paris station labels

The edition owns its editorial hierarchy in `src/editions/paris-station-labels.ts`.
Overview labels favour the major termini and orientation hubs; the next group
adds interchanges and landmarks. Exact names resolve against the station index.
The renderer's original ranking remains the fallback within unlisted stations.

At semantic camera heights of 30 and above, the overview group competes for
space. Below 30, editorial interchanges and existing source tiers 1–2 join it.
Below 15, every station becomes eligible, including minor Métro and suburban
stops. Smaller local labels at this scale leave room for more neighbouring names.
Eligibility applies to stations in the currently loaded layers.

The global first-N rank cutoff is removed from label admission: an off-screen
station cannot consume a rank slot and prevent a lower-ranked local station from
being considered. Existing visible-label budgets, collision handling, viewport
margins and selection emphasis still apply, so eligibility does not guarantee
that every adjacent name fits simultaneously.
Map tap targets use the same ordering and zoom eligibility, so newly admitted
stations can also be selected.

Source `labelRank` values remain unchanged, preserving label sizing and station
focus distances. The checked alpha.2 build adapter applies this policy locally.
A future shared renderer API can accept edition ordering and zoom eligibility;
the Paris station catalogue belongs here.
