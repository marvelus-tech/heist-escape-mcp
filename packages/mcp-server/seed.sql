-- Heist Escape Room Game Content
-- Five-room cooperative heist with light theme, 15+ objects, 4 code puzzles

-- ===== ROOMS =====
INSERT INTO rooms (id, name, description, atmosphere, exits) VALUES
(1, 'Museum Lobby', 'A bright, sunlit lobby with polished marble floors and tall windows. Soft classical music plays from hidden speakers. A mahogany reception desk sits to your left, and an ornate brass door marked "Gallery A" gleams ahead. The walls are adorned with promotional posters for current exhibits.', 'Warm morning light streams through floor-to-ceiling windows. The air carries a faint scent of jasmine from a nearby flower arrangement. The space feels calm, professional, and welcoming.', 'gallery-a'),

(2, 'Gallery A - Renaissance Wing', 'An elegant gallery with cream-colored walls and strategic spotlighting on each painting. A velvet rope barrier protects the exhibits. Glass display cases line the side walls, and a locked brass door marked "Archives" is set into the far wall. The room has excellent acoustics.', 'Soft white spotlights create dramatic shadows. The temperature is precisely controlled. Your footsteps echo slightly on the hardwood floor.', 'lobby,archives'),

(3, 'Archives Room', 'A climate-controlled room with floor-to-ceiling filing cabinets in warm oak finish. A librarian''s desk sits in the center, covered with cataloging equipment and reference books. Soft amber reading lamps provide focused illumination. A reinforced door labeled "Vault Access" is visible behind a large painting.', 'The air is cool and dry. Papers rustle softly. Everything is meticulously organized. Warm wood tones and brass fixtures give the space a scholarly atmosphere.', 'gallery-a,vault-access'),

(4, 'Vault Access Corridor', 'A narrow, well-lit corridor with white walls and emergency lighting strips near the floor. A secure keypad-locked door blocks access to the vault. Security cameras are visible but inactive. A large blueprint hangs on the wall in a glass frame, and a maintenance locker stands partially open.', 'Bright fluorescent lighting. The corridor hums with HVAC equipment. Everything is clean, modern, and purposeful.', 'archives,vault'),

(5, 'The Vault', 'The vault interior is surprisingly bright, with LED panels in the ceiling providing daylight-spectrum illumination. Steel shelves line the walls, holding velvet-lined boxes and protective cases. In the center, on a pedestal, sits the target: the "Sunburst Diamond" catching light and throwing rainbow patterns across the white walls.', 'Cool, sterile air. The vault door''s mechanism ticks softly. Success is tangible here - the culmination of your carefully planned heist.', 'none');

-- ===== OBJECTS =====
-- Room 1: Museum Lobby
INSERT INTO objects (room_id, name, short_description, full_description, interaction_hints, is_takeable, is_container) VALUES
(1, 'reception-desk', 'A polished mahogany reception desk', 'The desk is made of rich mahogany with brass drawer pulls. Papers are neatly organized in trays. A nameplate reads "Curator: Dr. Elena Bright". The desk has three drawers and a telephone with a Post-it note stuck to it.', 'The desk has drawers you could open. The phone has a note attached.', 0, 1),

(1, 'visitor-log', 'A leather-bound visitor log', 'An elegant leather logbook lies open on the desk. Recent entries are visible. One entry stands out: "Room 3-A, Catalog #7734". The handwriting is neat and precise.', 'This might be a catalog reference number for something in the archives.', 1, 0),

(1, 'poster-board', 'A promotional poster board', 'A corkboard displays colorful posters for upcoming exhibits. One poster for "Diamonds Through the Ages" has a sticky note: "Preview - See briefing for assembly rule: ORDER BY ROOM NUMBER"', 'The sticky note mentions an assembly rule that applies to something. The diamond exhibit seems important.', 0, 0),

(1, 'flower-arrangement', 'A large floral arrangement', 'A stunning arrangement of white lilies and jasmine in a crystal vase. Hidden among the flowers is a brass key attached to a tag reading "Gallery A Access".', 'You could search more carefully among the flowers.', 0, 0),

-- Room 2: Gallery A
(2, 'display-case-west', 'A glass display case', 'The case contains Renaissance-era jewelry and accessories. A placard describes each piece. One small note card is tucked behind a brooch: "The vault code digit for Room 2 is: 8"', 'You should examine this more closely to read what it contains.', 0, 0),

(2, 'painting-landscape', 'A large pastoral landscape painting', 'A beautiful oil painting showing rolling hills at golden hour. The frame has a small brass plaque: "Gift of the Belmont Estate, 1973"', 'Just a painting, but the golden light is beautifully rendered.', 0, 0),

(2, 'archives-door', 'A locked brass door', 'The door to the Archives room is locked with an old-fashioned keyhole. A sign reads "Staff Only - Researchers by Appointment"', 'This door requires a key. You might find one elsewhere.', 0, 0),

(2, 'velvet-rope', 'Velvet rope barrier', 'A brass stanchion with burgundy velvet rope protects the paintings. Professional and elegant.', 'Standard museum barrier, nothing special here.', 0, 0),

-- Room 3: Archives
(3, 'filing-cabinet-north', 'A tall oak filing cabinet', 'The cabinet has four drawers labeled A-D, E-H, I-L, M-P. The J-L drawer is slightly ajar.', 'You could open specific drawers to search them.', 0, 1),

(3, 'desk-lamp', 'A brass desk lamp', 'An adjustable brass reading lamp with a warm amber bulb. The base has an inscription: "To Elena, For Late Nights - M"', 'A personal gift, but nothing hidden here.', 0, 0),

(3, 'card-catalog', 'A vintage card catalog chest', 'A beautiful wooden chest with dozens of small drawers, each with a brass label holder. Most are labeled with topics. One drawer labeled "7734" has a small lock symbol drawn on the label.', 'The number 7734 matches something from the lobby log. This drawer needs opening.', 0, 1),

(3, 'hidden-painting', 'A large oil painting of a seascape', 'A substantial painting showing a clipper ship at sunrise. The frame is hinged on one side. Behind it, the outline of a door is barely visible.', 'This painting might swing aside to reveal something.', 0, 0),

-- Room 4: Vault Access Corridor
(4, 'vault-keypad', 'A secure keypad lock', 'A modern electronic keypad with a 4-digit input. A small LED blinks green, indicating it''s powered. The display reads "ENTER CODE:"', 'You need to enter a 4-digit code. The digits must come from somewhere.', 0, 0),

(4, 'blueprint-frame', 'A framed architectural blueprint', 'A large blueprint under glass showing the museum''s floor plan. In tiny text at the bottom: "Vault code digit for Room 4: 1"', 'Technical drawings with hidden information.', 0, 0),

(4, 'maintenance-locker', 'A gray metal locker', 'A utility locker, door slightly open. Inside: cleaning supplies, a flashlight, and a keycard labeled "Archives Access - Curator"', 'You could search the locker''s contents.', 0, 1),

-- Room 5: Vault
(5, 'sunburst-diamond', 'The Sunburst Diamond on a pedestal', 'A magnificent yellow diamond, roughly 45 carats, sits on a white velvet pillow inside a climate-controlled display case. Light refracts through its perfect cut, creating dancing rainbows on the walls. The case has a simple button labeled "Unlock" - the vault code has already disarmed the security.', 'The prize! The heist is complete when you claim this.', 1, 0),

(5, 'steel-shelves', 'Rows of secure storage shelves', 'Numbered steel shelves hold various museum treasures in protective cases: ancient coins, rare manuscripts, gemstones. Everything is cataloged and stored with museum-quality care.', 'The other treasures are impressive, but you came for the diamond.', 0, 0),

(5, 'environmental-controls', 'A wall-mounted control panel', 'Digital displays show temperature (68°F), humidity (45%), and atmospheric pressure. A log screen indicates "System Normal - Last Service: 48 hours ago"', 'Museum-grade environmental controls to preserve the collection.', 0, 0);

-- ===== DRAWERS =====
INSERT INTO drawers (id, object_id, contents, locked) VALUES
('reception-desk-top', (SELECT id FROM objects WHERE name='reception-desk'), 'Pens, paperclips, a box of business cards for Dr. Elena Bright', 0),
('reception-desk-middle', (SELECT id FROM objects WHERE name='reception-desk'), 'Personnel files, blank visitor badges, a staff schedule', 0),
('reception-desk-bottom', (SELECT id FROM objects WHERE name='reception-desk'), 'Emergency procedures binder, first aid kit, and a small notebook with "Code audit: Room 1 = 3" written on the first page', 0),

('filing-j-l', (SELECT id FROM objects WHERE name='filing-cabinet-north'), 'Files for artists whose names start with J-L. Between two folders is a note: "Vault code digit for Room 3: 9"', 0),

('card-catalog-7734', (SELECT id FROM objects WHERE name='card-catalog'), 'A catalog card for a Renaissance bronze sculpture. Handwritten on the back: "Ask about the sunburst diamond - Exhibition code: 3891"', 1);

-- ===== DOCUMENTS =====
INSERT INTO documents (name, content, clue_type, room_id) VALUES
('Briefing Note', 'HEIST BRIEFING\n\nTarget: Sunburst Diamond\nLocation: Museum Vault (Room 5)\n\nNOTE: The 4-digit vault access code is scattered throughout the museum. Each room (1-4) contains one digit.\n\nASSEMBLY RULE: Combine digits in order by room number (Room 1, Room 2, Room 3, Room 4).\n\nGood luck. Work together. Communication is key.', 'briefing', 1),

('Phone Post-It', 'Call maintenance if Archive door sticks. Key should be in lobby flowers per usual.', 'hint', 1),

('Gallery Placard', 'Renaissance Jewelry Collection\nLoaned by the Wexler Foundation\n\nNote: Please see curator for documentation on Vault storage protocols.', 'flavor', 2),

('7734 Catalog Card (back)', 'Bronze sculpture, Florence, 1489.\n\nVault exhibition code: 3891\n\nThis is the complete 4-digit code for vault access, obtained by combining room digits 3-8-9-1.', 'solution', 3);

-- ===== PUZZLES =====
-- Puzzle 1: Archives door key (hidden in flowers)
-- Puzzle 2: Card catalog drawer key (solution from visitor log #7734)
-- Puzzle 3: Vault keypad - 4 digits from 4 rooms (3891)
-- Puzzle 4: Final diamond claim (interaction-based)

INSERT INTO puzzles (room_id, puzzle_type, solution_hash, success_message, failure_message, unlocks_what) VALUES
(1, 'keycard', 'gallery-a-key', 'The brass key fits perfectly! The Gallery A door swings open silently.', 'That doesn''t seem to work here.', 'archives-door'),

(3, 'catalog-access', '7734', 'The drawer slides open smoothly. Inside is a catalog card with critical information!', 'That drawer won''t open - you need the right catalog number.', 'card-catalog-7734'),

(4, 'vault-code', '3891', 'BEEP BEEP BEEP - The keypad flashes green! The vault door''s locking bolts retract with a satisfying CLUNK. The path to the diamond is open!', 'BEEP - Access Denied. The code is incorrect. The keypad remains locked.', 'vault');

-- ===== HINTS =====
-- Progressive hints per room

-- Room 1 hints
INSERT INTO hints (room_id, sequence, hint_text) VALUES
(1, 1, 'The reception area often has useful information. Try examining the desk and any notices on display.'),
(1, 2, 'The poster board has a note about an assembly rule. The desk drawers might contain partial information.'),
(1, 3, 'Look for digit clues in each room. The bottom desk drawer has a notebook with one digit. The flowers hide a key.');

-- Room 2 hints
INSERT INTO hints (room_id, sequence, hint_text) VALUES
(2, 1, 'The archives door needs a key. You may have found it in the previous room.'),
(2, 2, 'Display cases often have information cards. Examine them carefully.'),
(2, 3, 'The western display case has a hidden note card with a digit for the vault code.');

-- Room 3 hints
INSERT INTO hints (room_id, sequence, hint_text) VALUES
(3, 1, 'The visitor log from the lobby mentioned "Room 3-A, Catalog #7734". That number might be important here.'),
(3, 2, 'The card catalog has a drawer labeled 7734. One of the filing cabinets might also have information.'),
(3, 3, 'Filing cabinet drawer J-L contains another vault digit. The catalog drawer 7734 needs to be accessed with that number - use examine_object with "card-catalog" then use_item with the catalog number.');

-- Room 4 hints
INSERT INTO hints (room_id, sequence, hint_text) VALUES
(4, 1, 'You need a 4-digit code for the keypad. Each room (1-4) should have provided one digit.'),
(4, 2, 'The blueprint on the wall has text worth reading. Don''t forget to check all objects here.'),
(4, 3, 'Combine the digits in room order: Room 1=3, Room 2=8, Room 3=9, Room 4=1. Enter 3891.');

-- Room 5 hints
INSERT INTO hints (room_id, sequence, hint_text) VALUES
(5, 1, 'You''ve made it to the vault! The diamond is your objective.'),
(5, 2, 'Simply examine and take the Sunburst Diamond to complete the heist.'),
(5, 3, 'Victory is yours! Use examine_object on the diamond, then use_item to claim it.');
