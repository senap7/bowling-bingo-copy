# Grid Check from Screenshot

Row 0: 4|3, 7|1, 7◢, 5◢, 6|2
Row 1: 1|6, 6◢, 1|1, 1|7, 2|3
Row 2: 3|5, 5|2, ▶︎◀︎, 3|3, 1|5
Row 3: 3|2, 6|1, 7|2, 5|3, 4|1

Inner ring cells (row 1-3, col 1-3 excluding center):
(1,1)=6◢ ✓ spare
(1,2)=1|1 ✗ NOT spare
(1,3)=1|7 ✗ NOT spare
(2,1)=5|2 ✗ NOT spare
(2,3)=3|3 ✗ NOT spare
(3,1)=6|1 ✗ NOT spare
(3,2)=7|2 ✗ NOT spare
(3,3)=5|3 ✗ NOT spare

Issue: The shared layout from DB is still the old card. Need to reset shared layout to see the new generation logic.
