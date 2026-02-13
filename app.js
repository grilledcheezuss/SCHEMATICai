    static detectFields(textContent, viewport) {
        const fields = {};
        const items = textContent.items;
        
        const normalize = (x, y) => ({
            x: (x / viewport.width * 100).toFixed(2),
            y: ((viewport.height - y) / viewport.height * 100).toFixed(2)
        });
        
        // Helper: Check if text looks like a date
        const isDateLike = (text) => {
            return /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(text) || /\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(text);
        };
        
        // Helper: Check if text is title case / capitalized (likely a name)
        const isTitleCase = (text) => {
            return /^[A-Z][a-z]+/.test(text) && text.length > 2;
        };
        
        // Helper: Find value near a label (within next N items, proximity-based)
        const findNearbyValue = (startIdx, maxDistance = 10, validator = null) => {
            const labelItem = items[startIdx];
            const labelX = labelItem.transform[4];
            const labelY = labelItem.transform[5];
            
            for (let i = startIdx + 1; i < Math.min(items.length, startIdx + maxDistance); i++) {
                const candidate = items[i];
                const text = candidate.str.trim();
                if (!text || text.length < 2) continue;
                
                // Skip if it looks like another label
                if (/^[A-Z\s]+:$/i.test(text)) continue;
                
                // If validator provided, use it
                if (validator && !validator(text)) continue;
                
                // Check proximity (allow values within reasonable distance)
                const deltaY = Math.abs(candidate.transform[5] - labelY);
                const deltaX = candidate.transform[4] - labelX;
                
                // Value should be: same line (small deltaY) or below (larger deltaY but reasonable)
                if (deltaY < 20 || (deltaY < 50 && deltaX > -50)) {
                    return { item: candidate, text };
                }
            }
            return null;
        };
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const text = item.str.trim();
            if (!text) continue;
            
            const textUpper = text.toUpperCase();
            const x = item.transform[4];
            const y = item.transform[5];
            const normalized = normalize(x, y);
            
            // CUSTOMER DETECTION - match multiple variations
            if (!fields.customer && /^(CUSTOMER|CLIENT|COMPANY|OWNER|FOR|ATTN|TO)S?:?$/i.test(textUpper)) {
                const found = findNearbyValue(i, 10, (t) => isTitleCase(t) || /[A-Z]{2,}/.test(t));
                if (found) {
                    const valueNorm = normalize(found.item.transform[4], found.item.transform[5]);
                    fields.customer = {
                        label: { text: item.str, x: normalized.x, y: normalized.y },
                        value: { text: found.text, x: valueNorm.x, y: valueNorm.y }
                    };
                }
            }
            
            // JOB/PROJECT DETECTION - match multiple variations
            if (!fields.jobNo && /^(JOB|PROJECT|P\. ?O\. ?|WO|WORK\s*ORDER)[\s#NO\.]*:?$/i.test(textUpper)) {
                const found = findNearbyValue(i, 10, (t) => /[A-Z0-9\-]+/.test(t) && t.length > 1);
                if (found) {
                    const valueNorm = normalize(found.item.transform[4], found.item.transform[5]);
                    fields.jobNo = {
                        label: { text: item.str, x: normalized.x, y: normalized.y },
                        value: { text: found.text, x: valueNorm.x, y: valueNorm.y }
                    };
                }
            }
            
            // DATE DETECTION - match multiple variations and date formats
            if (!fields.date && /^(DATE|SUBMITTAL|REVISION|ISSUED|REV)[\s\w]*:?$/i.test(textUpper)) {
                const found = findNearbyValue(i, 8, isDateLike);
                if (found) {
                    const valueNorm = normalize(found.item.transform[4], found.item.transform[5]);
                    fields.date = {
                        label: { text: item.str, x: normalized.x, y: normalized.y },
                        value: { text: found.text, x: valueNorm.x, y: valueNorm.y }
                    };
                }
            }
            
            // PANEL ID - keep existing pattern + enhance with label detection
            if (!fields.panelId) {
                if (/CP-\d{4}/i.test(text)) {
                    fields.panelId = {
                        label: { text: "Panel ID", x: normalized.x, y: normalized.y },
                        value: { text: text, x: normalized.x, y: normalized.y }
                    };
                } else if (/^(PANEL|TAG|EQUIPMENT)[\s#]*:?$/i.test(textUpper)) {
                    const found = findNearbyValue(i, 5, (t) => /CP-\d{4}|[A-Z]{2,}-\d+/.test(t));
                    if (found) {
                        const valueNorm = normalize(found.item.transform[4], found.item.transform[5]);
                        fields.panelId = {
                            label: { text: item.str, x: normalized.x, y: normalized.y },
                            value: { text: found.text, x: valueNorm.x, y: valueNorm.y }
                        };
                    }
                }
            }
        }
        
        return fields;
    }