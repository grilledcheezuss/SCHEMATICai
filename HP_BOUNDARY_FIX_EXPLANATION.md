# HP Matching Boundary Fix - v2.5.9

## Problem Demonstration

### Before Fix (INCORRECT BEHAVIOR)
Searching for **0.5 HP** would match panels containing **1.5 HP**

Example regex pattern (OLD):
```javascript
// Pattern for "0.5 HP"
const hpPattern = `(?:^|\\s|\\(|,)(?:0.5|0.5\\.0)\\s*(?:HP|H\\.P\\.|H\\.P|KW|kW|HORSEPOWER)(?:\\s|\\)|,|$)`;

// This matches:
"Panel with 0.5 HP motor"  ✅ CORRECT
"Panel with 1.5 HP motor"  ❌ WRONG - "1.5" contains "0.5" as substring
"HP: 10.5"                 ❌ WRONG - "10.5" contains "0.5" as substring
"Motor 20.5HP"             ❌ WRONG - "20.5" contains "0.5" as substring
```

### After Fix (CORRECT BEHAVIOR)
Searching for **0.5 HP** now only matches actual **0.5 HP** values

Example regex pattern (NEW):
```javascript
// Pattern for "0.5 HP" with numeric boundary guards
const NUMERIC_BOUNDARY_BEFORE = '(?<![\\.\\d])'; // No digit or decimal before
const NUMERIC_BOUNDARY_AFTER = '(?![\\.\\d])';   // No digit or decimal after
const hpPattern = `(?:^|\\s|\\(|,)(?<![\\.\\d])(?:0.5|0.5\\.0)(?![\\.\\d])\\s*(?:HP|H\\.P\\.|H\\.P|KW|kW|HORSEPOWER)(?:\\s|\\)|,|$)`;

// This matches:
"Panel with 0.5 HP motor"  ✅ CORRECT
"HP: 0.5"                  ✅ CORRECT
"(0.5 HP)"                 ✅ CORRECT
"1/2 HP motor"             ✅ CORRECT (0.5 = 1/2)

// This does NOT match:
"Panel with 1.5 HP motor"  ✅ CORRECT - prevented by boundary guard
"HP: 10.5"                 ✅ CORRECT - prevented by boundary guard
"Motor 20.5HP"             ✅ CORRECT - prevented by boundary guard
```

## How Boundary Guards Work

### Negative Lookbehind: `(?<![\\.\\d])`
- Checks the character immediately **before** the HP value
- Ensures it's NOT a digit (0-9) or decimal point (.)
- Prevents "0.5" from matching in "1**0.5**" or "**.**5"

### Negative Lookahead: `(?![\\.\\d])`
- Checks the character immediately **after** the HP value
- Ensures it's NOT a digit (0-9) or decimal point (.)
- Prevents "0.5" from matching in "0.5**0**" or "0.**5**"

## Examples

### Example 1: Searching "0.5 HP"
```
Text: "Motor with 1.5 HP"
       └─────┬──────┘
       Position: ^
       Before "5": digit "1" and decimal "."
       ❌ Fails lookbehind: (?<![\\.\\d])
       Result: NO MATCH ✅
```

### Example 2: Searching "0.5 HP"
```
Text: "Panel (0.5 HP)"
            └─┬──┘
       Position: ^
       Before "0": "("
       After "5": " "
       ✅ Passes both lookbehind and lookahead
       Result: MATCH ✅
```

### Example 3: Searching "7.5 HP" with Mixed Fractions
```
Text: "Motor 7 1/2 HP"
       └────┬────┘
       Pattern: (?<![\\.\\d])7[-\\s]?(?:1/2|½)(?![\\.\\d])
       Before "7": " "
       After "2": " "
       ✅ Passes boundary checks
       Result: MATCH ✅
```

### Example 4: Searching "7.5 HP" vs "17 1/2 HP"
```
Text: "Motor 17 1/2 HP"
       └────┬─────┘
       Pattern looking for: (?<![\\.\\d])7[-\\s]?(?:1/2|½)(?![\\.\\d])
       Before "7": digit "1"
       ❌ Fails lookbehind: (?<![\\.\\d])
       Result: NO MATCH ✅ (Correctly excludes 17.5 when searching for 7.5)
```

## All Patterns Updated

### 1. Standard HP Pattern
```javascript
// For "0.5 HP", "1.5HP", "10.5 HP"
`${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}(?:${searchHp}|${searchHp}\\.0)${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`
```

### 2. Fractional Pattern
```javascript
// For "1/2 HP" (when searching 0.5)
`${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}1/2${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`
```

### 3. Mixed Fraction Pattern
```javascript
// For "7 1/2 HP", "7-1/2 HP", "7½ HP" (when searching 7.5)
`${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}7[-\\s]?(?:1/2|½)${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`
```

### 4. Table Format Pattern
```javascript
// For "HP: 1.5", "HP | 1.5", "Motor HP 1.5"
`(?:HP|HORSEPOWER|MOTOR\\s+HP)\\s*[:\\s|]+\\s*${NUMERIC_BOUNDARY_BEFORE}${searchHp}${NUMERIC_BOUNDARY_AFTER}(?:\\s|\\)|,|$)`
```

## Test Coverage

### 43 Automated Tests
- ✅ Boundary prevention (0.5 doesn't match 1.5, 10.5, etc.)
- ✅ Exact matches (0.5 matches 0.5)
- ✅ Fractional support (0.5 matches 1/2)
- ✅ Mixed fraction support (7.5 matches 7 1/2, 7-1/2, 7½)
- ✅ Table format matching (HP: 1.5, HP | 1.5)
- ✅ Punctuation boundaries ((0.5 HP), Motor, 0.5 HP, 480V)
- ✅ No false positives (7.5 doesn't match 17 1/2)

### Test Results
```
📊 Overall Results: 43 passed, 0 failed
✨ All tests passed!
```

## Version History Entry

**v2.5.9**: Fixed HP matching boundaries: 0.5 HP searches no longer match 1.5 HP (numeric boundary guards)
