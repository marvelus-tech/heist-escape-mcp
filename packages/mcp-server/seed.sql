-- Heist Escape Room Game Content
-- "Diamonds Through the Ages" story seed.
--
-- Cover story: a two-person closed-door security red-team hired by curator Dr. Elena Bright
-- the night before the gala. True mission (revealed via catalog card 7734): Elena fears her
-- patron Marcus Wexler ("M") swapped the Sunburst Diamond; recover the authentic stone.
--
-- Clue-language rules for this file:
--   * The vault keypad still expects 3891 (marks 3-8-9-1 in walking order Lobby, Gallery A,
--     Archives, Vault Access). No clue is ever written as "Room N digit is X".
--   * Numerals appear ONLY where they are a clue mark (3, 8, 9, 1) or the catalog number (7734).
--     Every other quantity is spelled out so nothing competes with the real marks.
--   * Runtime hooks that must keep their exact names: flower-arrangement, hidden-painting,
--     card-catalog, card-catalog-7734, vault-keypad, sunburst-diamond, exits gallery-a /
--     archives / vault-access / vault. See docs/redesign/STORY-SEED-MANIFEST.md.

-- ===== ROOMS =====
INSERT INTO rooms (id, name, description, atmosphere, exits) VALUES
(1, 'Museum Lobby', 'A bright, sunlit lobby with polished marble floors and tall windows. Soft classical music drifts from hidden speakers. A mahogany reception desk sits to your left beneath a small security monitor whose camera feeds are all dark; a banner across the screen reads CAMERAS: MAINTENANCE WINDOW. Ahead, an ornate brass door marked "Gallery A" gleams. The walls carry posters for the gala opening tomorrow night: "Diamonds Through the Ages".', 'Warm morning light streams through floor-to-ceiling windows. The air carries a faint scent of jasmine from a nearby flower arrangement. Everything is calm, professional, and welcoming. Nobody else is in the building.', 'gallery-a'),

(2, 'Gallery A - Renaissance Wing', 'An elegant gallery with cream-colored walls and spotlights trained on each painting. A velvet rope guards the exhibits. Glass display cases line the side walls, their placards freshly reprinted for the gala loan. A locked brass door marked "Archives" is set into the far wall. The camera dome in the corner is dark.', 'Soft white spotlights carve dramatic shadows. The temperature is precisely controlled. Your footsteps echo slightly on the hardwood floor.', 'lobby,archives'),

(3, 'Archives Room', 'A climate-controlled room lined with floor-to-ceiling oak filing cabinets. A librarian''s desk sits in the center under a brass reading lamp, covered in loan paperwork and cataloging equipment. A vintage card catalog stands against one wall. A large seascape painting hangs slightly proud of the far wall, as if it were mounted on a hinge.', 'The air is cool and dry. Papers rustle softly. Everything is meticulously filed, except for one folder someone has deliberately misplaced. Warm wood and brass give the room a scholarly hush.', 'gallery-a,vault-access'),

(4, 'Vault Access Corridor', 'A narrow, well-lit corridor with white walls and emergency lighting strips near the floor. A keypad-locked steel door blocks the way to the vault. Security cameras are mounted overhead, lenses dark, each wearing a paper maintenance tag. A framed architectural blueprint hangs under glass, stamped with a fresh revision. A gray maintenance locker stands partially open.', 'Bright, even lighting. The corridor hums with HVAC equipment. Everything is clean, modern, and purposeful; the only thing out of place is how quiet the cameras are.', 'archives,vault'),

(5, 'The Vault', 'The vault interior is surprisingly bright, daylight-spectrum LED panels washing the white walls. Steel shelves line the room, holding velvet boxes and protective cases; one case wears a Wexler Foundation loan seal and a small keycard reader. In the center, on a lit pedestal, sits the Sunburst Diamond, throwing rainbows across the walls. It looks perfect. Elena told you not to trust that.', 'Cool, sterile air. The vault door''s mechanism ticks softly behind you. This is where the red-team story ends and the real job begins.', 'vault-access');

-- ===== OBJECTS =====
-- Room 1: Museum Lobby
INSERT INTO objects (room_id, name, short_description, full_description, interaction_hints, is_takeable, is_container) VALUES
(1, 'reception-desk', 'A polished mahogany reception desk', 'Rich mahogany with brass drawer pulls and paperwork squared into trays. A nameplate reads "Curator: Dr. Elena Bright". A small security monitor sits behind the desk showing every camera feed dark, with a banner across the screen: CAMERAS: MAINTENANCE WINDOW. No end time is listed. The desk has a top, middle and bottom drawer, and a telephone with a Post-it note stuck to the handset.', 'The desk has drawers you could open (reception-desk-top, reception-desk-middle, reception-desk-bottom). The phone has a note attached.', 0, 1),

(1, 'visitor-log', 'A leather-bound visitor log', 'An elegant leather logbook lies open on the desk. Most entries are school groups and members. Two stand out, in the same neat hand. The first: "M. Wexler, after hours, Vault Access, escorted by E.B." The second, underlined twice: "Archives, Catalog #7734, hold for red-team."', 'The catalog number is a reference for something in the Archives. The after-hours entry tells you who has been where they should not be.', 1, 0),

(1, 'poster-board', 'A promotional poster board', 'A corkboard of posters for the gala opening of "Diamonds Through the Ages", the Sunburst Diamond blazing across each one. Pinned over the centerpiece poster is a note in the curator''s hand: "Red-team walkthrough runs the guest route: Lobby, Gallery A, Archives, Vault Access. Keep your marks in that order. Everything you need is already in the paperwork. E.B."', 'The note describes the order of the walkthrough and says the marks are hidden in ordinary paperwork. The exhibit itself seems to be the whole point of tonight.', 0, 0),

(1, 'flower-arrangement', 'A large floral arrangement', 'A stunning arrangement of white lilies and jasmine in a crystal vase, delivered for the gala. Tucked among the stems is a brass key on a tag reading "Gallery A Access".', 'You could search more carefully among the flowers.', 0, 0),

-- Room 2: Gallery A
(2, 'display-case-west', 'A glass display case', 'The case holds Renaissance jewelry: enamelled pendants, a cameo brooch, a ring set with a table-cut stone. The placard has been reprinted for the gala: "RENAISSANCE JEWELRY. Wexler Foundation Loan, Agreement No. 8. Lender: Marcus Wexler. The centerpiece of this agreement, the Sunburst Diamond, is held in the vault and will be installed in this case for the gala opening." The velvet pillow where it will sit is still empty.', 'Read the placard as if it were a contract. The loan paperwork is the point of this room.', 0, 0),

(2, 'painting-landscape', 'A large pastoral landscape painting', 'A beautiful oil of rolling hills at golden hour. The brass plaque reads: "Gift of the Belmont Estate. Reframed and relit courtesy of the Wexler Foundation." The Foundation''s name is on a lot of things in this building.', 'Just a painting, but the donor line is another Wexler fingerprint.', 0, 0),

(2, 'archives-door', 'A locked brass door', 'The door to the Archives is locked with an old-fashioned keyhole. A sign reads "Staff Only. Researchers by Appointment." The brass key from the lobby flowers looks like a match.', 'This door takes the same brass key that opened Gallery A.', 0, 0),

(2, 'velvet-rope', 'Velvet rope barrier', 'A brass stanchion with burgundy velvet rope protects the paintings. A small printed card hangs from it: "Gala seating plan to follow. Patron table reserved for the Wexler party."', 'Standard museum barrier. The card is flavor, not a clue.', 0, 0),

-- Room 3: Archives
(3, 'filing-cabinet-north', 'A tall oak filing cabinet', 'The cabinet holds lender and loan files in drawers labeled A-D, E-H, I-L and M-P. The I-L drawer is slightly ajar, and a folder tab is visible that clearly does not belong to that range.', 'You could open specific drawers to search them (filing-j-l).', 0, 1),

(3, 'desk-lamp', 'A brass desk lamp', 'An adjustable brass reading lamp with a warm amber bulb. The base is engraved: "To Elena, For Late Nights. M." Someone has been working at this desk very late; the loan paperwork beneath the lamp is annotated in a tight, tired hand.', 'A personal gift from M. Nothing hidden inside, but it tells you how close Elena and her patron were.', 0, 0),

(3, 'card-catalog', 'A vintage card catalog chest', 'A wooden chest with dozens of small drawers, each with a brass label holder. Most are labeled by topic. One drawer is labeled only "7734" and has a small lock symbol drawn on the label in the curator''s hand.', 'The label matches the number held for the red-team in the visitor log. Enter that number at the card-catalog to release the drawer, then open card-catalog-7734.', 0, 1),

(3, 'hidden-painting', 'A large oil painting of a seascape', 'A substantial painting of a clipper ship at sunrise. The frame is hinged on one side and sits a finger''s width off the wall. Behind it, the outline of a reinforced door is barely visible. A pencilled note on the frame''s edge reads: "Trust this path. E."', 'This painting swings aside. Use it with action pull.', 0, 0),

-- Room 4: Vault Access Corridor
(4, 'vault-keypad', 'A secure keypad lock', 'A modern electronic keypad beside the vault door. A small LED blinks green, showing it is powered. The display reads "ENTER SEQUENCE". A slip of curator''s tape above it says: "Reissued for the gala. Four marks, walking order."', 'The keypad wants the four marks you have collected, in the order a guest walks the building: lobby, gallery, archives, corridor.', 0, 0),

(4, 'blueprint-frame', 'A framed architectural blueprint', 'A large blueprint under glass showing the vault corridor and door. The title block has been stamped and initialled for the gala: "VAULT ACCESS CORRIDOR. Revision 1, issued for gala installation. All prior revisions withdrawn. Approved: E. Bright." In the margin, in pencil: "Only the current revision counts."', 'The revision in the title block is this corridor''s mark.', 0, 0),

(4, 'security-camera', 'A ceiling camera with a paper tag', 'A dome camera with its indicator light dead. The paper tag hanging from it reads "OFFLINE. SCHEDULED MAINTENANCE WINDOW. Authorized: E. Bright." The tag is dated tonight, and the window has no end time. Nobody schedules maintenance for the night before a gala.', 'The cameras were not turned off for maintenance. Someone in this building wanted no record of tonight.', 0, 0),

(4, 'maintenance-locker', 'A gray metal locker', 'A utility locker, door slightly open. Inside: cleaning supplies, a flashlight, and on the top shelf a lanyard holding a white keycard printed "CURATOR. Vault loan cases." A sticky note on it reads: "Take this with you. The pedestal is not the job. E."', 'Search the locker (open_drawer maintenance-locker-shelf) and take the curator-keycard before you go through the vault door.', 0, 1),

(4, 'curator-keycard', 'A white curator keycard on a lanyard', 'A white access card printed "CURATOR. Vault loan cases." with Dr. Elena Bright''s name beneath. The magnetic strip is unworn. It opens the loan case readers on the vault shelves, not the vault door itself.', 'Take it. In the vault, use it on the steel-shelves to open the Wexler loan case.', 1, 0),

-- Room 5: Vault
(5, 'sunburst-diamond', 'The Sunburst Diamond on a pedestal', 'A magnificent yellow stone, big as a quail''s egg, on a white velvet pillow inside a lit case. Light pours through its cut and paints rainbows on the walls. Then you look closer. A loupe is clipped to the case, and under it the girdle carries a laser inscription: REPLICA. DTA GALA DISPLAY. The registrar''s tag underneath confirms it: "Display copy for pedestal. Authentic stone held in Wexler loan case, shelf storage, curator access only." Whoever was meant to walk out with this tonight would have walked out with glass.', 'You can take it, but it is the replica. Elena said not to trust what sits on the pedestal. The authentic stone is on the steel-shelves.', 1, 0),

(5, 'steel-shelves', 'Rows of secure storage shelves', 'Numbered steel shelves hold the museum''s treasures in protective cases: coins, manuscripts, gemstones. One case is different: a velvet-lined loan case sealed with a Wexler Foundation sticker and fitted with a small keycard reader, its light red. A registrar''s tag reads "Sunburst Diamond. Authentic. Loan return pending." This is the case the curator keycard was cut for.', 'Use the curator-keycard on the steel-shelves to open the loan case (steel-shelves-loan-case), then take sunburst-diamond-authentic.', 0, 1),

(5, 'sunburst-diamond-authentic', 'The authentic Sunburst Diamond in its loan case', 'Inside the Wexler loan case, on old velvet, sits the real Sunburst. It is smaller than the pedestal stone and warmer in color, and under the loupe the girdle carries only the cutter''s mark and the registrar''s seal, unbroken. A card from Elena is tucked beneath it: "This is the one. The pedestal is what M. expected you to take. Get it somewhere he cannot reach before the gala. Thank you. E."', 'This is the objective. Take it to complete the recovery.', 1, 0),

(5, 'environmental-controls', 'A wall-mounted control panel', 'Digital displays show temperature and humidity holding steady in the green. The event log reads: "Vault camera: OFFLINE. Maintenance window authorized by E. Bright." Beneath it, an older line: "Loan case opened. Badge: M. WEXLER. Escort: E. Bright." The last person to open that case was the patron.', 'Museum-grade environmental controls. The log shows who has been inside the loan case.', 0, 0);

-- ===== DRAWERS =====
INSERT INTO drawers (id, object_id, contents, locked) VALUES
('reception-desk-top', (SELECT id FROM objects WHERE name='reception-desk'), 'Pens, paperclips, a box of business cards for Dr. Elena Bright, and a gala invitation addressed to "Mr. Marcus Wexler, Patron" that was never sent.', 0),

('reception-desk-middle', (SELECT id FROM objects WHERE name='reception-desk'), 'Blank visitor badges and the gala staff schedule. The schedule''s top sheet is headed GALA LOAN PREP, Diamonds Through the Ages: "Sunburst Diamond (Wexler Foundation loan) receives through LOAN BAY 3. All gala loan crates route through Bay 3; do not accept at the front desk. Curator to sign personally." The bay number is circled.', 0),

('reception-desk-bottom', (SELECT id FROM objects WHERE name='reception-desk'), 'An emergency procedures binder, a first aid kit, and a small notebook labeled "Keypad audit, routine, pre-gala" in Dr. Bright''s hand. The first page reads: "Marks reissued for the gala and left in plain sight, dressed as ordinary paperwork. Reception keeps its mark in the loan bay. The gallery keeps its mark on the loan placard. The archives keep theirs on a loan folder. The corridor keeps its mark in the blueprint revision. Read them in the order a guest walks the building."', 0),

('filing-j-l', (SELECT id FROM objects WHERE name='filing-cabinet-north'), 'Lender files for names I through L, neatly tabbed. Wedged at the back, out of alphabetical order, is a thick folder tabbed "WEXLER / SUNBURST. Provenance. Loan File 9." A note in Elena''s hand is clipped to the tab: "Filed under L for Loan, not W. Anyone who wants to find W will look under W."', 0),

('card-catalog-7734', (SELECT id FROM objects WHERE name='card-catalog'), 'A single catalog card for a bronze that was deaccessioned years ago; nobody pulls this card. The back is covered in the curator''s handwriting: "If you are reading this you followed the log and not the tour. Good. The cameras are dark because I darkened them; there is no maintenance window, there is only tonight. M. gave me the lamp, the loan and the keypad sequence. He knows the four marks as well as I do, which is why I stopped trusting the front of the house. Do not trust what sits on the pedestal. Trust the path behind the painting. The gate reads the marks the way a guest walks the building: reception, gallery, archives, corridor. You have most of them if you have been reading the paperwork; the corridor keeps the last. E.B."', 1),

('maintenance-locker-shelf', (SELECT id FROM objects WHERE name='maintenance-locker'), 'Cleaning supplies, a flashlight, and a lanyard holding a white keycard printed "CURATOR. Vault loan cases." A sticky note on the card: "Take this with you. The pedestal is not the job. E." (use_item action take, itemName curator-keycard)', 0),

('steel-shelves-loan-case', (SELECT id FROM objects WHERE name='steel-shelves'), 'The Wexler Foundation loan case, velvet-lined. Inside, on the old velvet: the authentic Sunburst Diamond, registrar''s seal unbroken, and a card from Elena. (use_item action take, itemName sunburst-diamond-authentic)', 1);

-- ===== DOCUMENTS =====
INSERT INTO documents (name, content, clue_type, room_id) VALUES
('Red-Team Briefing', 'CLOSED-DOOR SECURITY REVIEW\nDiamonds Through the Ages, night before opening\nEngaged by: Dr. Elena Bright, Curator\n\nScope: walk the guest route (Lobby, Gallery A, Archives, Vault Access) and reach the vault using only what staff have left in plain sight. Cameras are down for a scheduled maintenance window, so tonight is the only clean run.\n\nThe vault keypad has been reissued for the gala. It expects four marks, one from each area, read in walking order. Each area keeps its mark in ordinary paperwork. Nothing is labeled.\n\nWork as a pair. Read everything. Report anything that does not add up.\n\nE.B.', 'briefing', 1),

('Phone Post-It', 'Facilities: the Archive door still sticks. Same brass key as Gallery A; it lives in the lobby flowers per usual. Cameras are on a maintenance window tonight, so do not bother logging your access.', 'hint', 1),

('Camera Maintenance Notice', 'ALL CAMERAS: SCHEDULED MAINTENANCE WINDOW\nAuthorized: E. Bright, Curator\nWindow ends: (blank)\n\nStaff are reminded that the building is closed to the public until the gala.', 'flavor', 1),

('Gallery Placard', 'RENAISSANCE JEWELRY\nWexler Foundation Loan, Agreement No. 8\nLender: Marcus Wexler\n\nThe centerpiece of this agreement, the Sunburst Diamond, is held in the vault and will be installed in this case for the gala opening. Loan documentation is filed with the Archives.', 'clue', 2),

('7734 Catalog Card (back)', 'If you are reading this you followed the log and not the tour. Good.\n\nThe cameras are dark because I darkened them. There is no maintenance window; there is only tonight.\n\nM. gave me the lamp, the loan and the keypad sequence. He knows the four marks as well as I do, which is why I stopped trusting the front of the house.\n\nDo not trust what sits on the pedestal. Trust the path behind the painting.\n\nThe gate reads the marks the way a guest walks the building: reception, gallery, archives, corridor. You have most of them if you have been reading the paperwork; the corridor keeps the last.\n\nE.B.', 'reveal', 3),

('Blueprint Title Block', 'VAULT ACCESS CORRIDOR\nRevision 1, issued for gala installation.\nAll prior revisions withdrawn.\nApproved: E. Bright\n\n(margin, pencil) Only the current revision counts.', 'clue', 4),

('Registrar Tag (pedestal)', 'DISPLAY COPY for pedestal. Laser-inscribed REPLICA, DTA GALA DISPLAY.\nAuthentic stone held in Wexler loan case, shelf storage, curator access only.', 'reveal', 5);

-- ===== PUZZLES =====
-- Puzzle 1: Gallery A door (brass key hidden in the lobby flowers; same key opens Archives)
-- Puzzle 2: Card catalog drawer 7734 (number from the visitor log) -> Elena's reveal
-- Puzzle 3: Vault keypad, four marks in walking order (3891)
-- Puzzle 4: Curator keycard on the steel-shelves loan case -> authentic diamond (Logic hook)

INSERT INTO puzzles (room_id, puzzle_type, solution_hash, success_message, failure_message, unlocks_what) VALUES
(1, 'keycard', 'gallery-a-key', 'The brass key from the flowers turns cleanly. The Gallery A door swings open onto the Renaissance Wing.', 'That doesn''t fit anything here.', 'gallery-a'),

(3, 'catalog-access', '7734', 'Drawer 7734 slides out. The card inside was never about a bronze; the back is covered in Elena''s handwriting.', 'The drawer holds fast. It wants the number the curator held for you in the visitor log.', 'card-catalog-7734'),

(4, 'vault-code', '3891', 'The keypad reads the four marks in walking order and glows green. The locking bolts retract with a heavy CLUNK and the vault door drifts open. Remember what Elena wrote about the pedestal.', 'A flat tone. The keypad rejects the sequence. Check your marks and the order a guest would walk them.', 'vault'),

(5, 'curator-keycard', 'curator-keycard', 'The reader on the loan case blinks from red to green and the Wexler seal splits. The authentic Sunburst is inside.', 'The loan case reader ignores that. It wants the curator''s keycard from the corridor locker.', 'steel-shelves-loan-case');

-- ===== HINTS =====
-- Progressive hints, three tiers per room. Tier three may name tools and object ids but never prints a mark as "digit = X".

-- Room 1 hints
INSERT INTO hints (room_id, sequence, hint_text) VALUES
(1, 1, 'Elena dressed the walkthrough as routine paperwork. Read the desk, the poster board and the visitor log before you touch anything.'),
(1, 2, 'The notebook in the bottom desk drawer says where each area keeps its mark. For reception, that means the loan bay on the gala staff schedule.'),
(1, 3, 'Open reception-desk-middle and note which loan bay the Sunburst crate routes through; that is the lobby''s mark. Then examine the flower-arrangement, take gallery-a-key, and use_item action open, target gallery-a.');

-- Room 2 hints
INSERT INTO hints (room_id, sequence, hint_text) VALUES
(2, 1, 'This room is about the Wexler loan. Read every placard as if it were a contract.'),
(2, 2, 'The western display case carries the loan paperwork. The agreement number on that placard is the gallery''s mark.'),
(2, 3, 'Examine display-case-west and note the Loan Agreement number. The brass key from the flowers also opens the Archives: use_item action open, target archives.');

-- Room 3 hints
INSERT INTO hints (room_id, sequence, hint_text) VALUES
(3, 1, 'Two things matter here: the catalog number the curator held for you in the visitor log, and the folder in the cabinet that is filed where it should not be.'),
(3, 2, 'Open filing-j-l and read the tab on the misfiled Wexler folder; its loan file number is the archives'' mark. Then enter the visitor log number at the card-catalog.'),
(3, 3, 'enter_code 7734 with target card-catalog, then open_drawer card-catalog-7734 and read Elena''s note carefully. When you are done, use_item hidden-painting with action pull, then use_item action open, target vault-access.');

-- Room 4 hints
INSERT INTO hints (room_id, sequence, hint_text) VALUES
(4, 1, 'The blueprint was reissued for the gala. Only the current revision matters, and the keypad wants all four marks.'),
(4, 2, 'Examine blueprint-frame and read the revision in the title block; that is the corridor''s mark. The keypad reads the marks in the order a guest walks the building: lobby, gallery, archives, corridor.'),
(4, 3, 'Assemble in walking order: loan bay (lobby), loan agreement (gallery), loan file (archives), blueprint revision (corridor), and enter_code that sequence at vault-keypad. Before you do, open_drawer maintenance-locker-shelf and take curator-keycard; you will need it inside.');

-- Room 5 hints
INSERT INTO hints (room_id, sequence, hint_text) VALUES
(5, 1, 'Elena said not to trust what sits on the pedestal. Examine it closely before you celebrate.'),
(5, 2, 'The pedestal stone is the gala display copy. The authentic Sunburst is in the Wexler loan case on the steel-shelves, behind a keycard reader.'),
(5, 3, 'If you do not have curator-keycard, go back through vault-access and take it from the maintenance-locker. Then use_item curator-keycard with action use, target steel-shelves, and take sunburst-diamond-authentic.');
