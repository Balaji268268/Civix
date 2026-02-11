# 🤝 ML Service Integration Guide (ASYNC VALIDATION)

## ✅ ML Service Changes (COMPLETED)

I've added a new image validation endpoint to the ML service:

### Endpoint Details
**URL**: `POST /api/validate-issue-image/`

**Request Body**:
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "category": "Roads"
}
```

**Response**:
```json
{
  "is_valid": false,
  "confidence": 0.88,
  "reason": "Image shows food, not a civic issue",
  "detected_content": "restaurant meal",
  "method": "GEMINI_VISION"
}
```

---

## 🎯 Architecture: Background Validation (Non-Blocking)

**User Experience Flow**:
```
User submits complaint → Accept immediately ✅
                              ↓
                    Save to database
                              ↓
           Validate in BACKGROUND (async)
                              ↓
              If spam detected:
              - Update issue status → "Spam"
              - Send notification to user
              - No UI blocking!
```

---

## 🚨 BACKEND INTEGRATION NEEDED

**File**: `backend/controllers/issues.js`

### Option 1: Fire-and-Forget (Recommended for simplicity)

```javascript
// Inside createIssue function, AFTER saving issue to database

const issue = await Issue.create({...}); // Issue saved first!

// THEN validate asynchronously (don't await - fire and forget)
if (fileUrl) {
    validateImageAsync(issue._id, fileUrl, category).catch(err => 
        console.error('Background validation failed:', err)
    );
}

// Return success to user immediately
return res.status(201).json({ success: true, issue });

// === Add this helper function at the end of the file ===

async function validateImageAsync(issueId, imageUrl, category) {
    try {
        const ML_URL = process.env.ML_SERVICE_URL || 'https://civix-ml.onrender.com';
        
        const response = await axios.post(
            `${ML_URL}/api/validate-issue-image/`,
            { imageUrl, category: category || 'General' },
            { timeout: 5000 }
        );
        
        const { is_valid, confidence, reason } = response.data;
        
        // If spam detected with high confidence
        if (!is_valid && confidence > 0.7) {
            const issue = await Issue.findById(issueId);
            if (!issue) return;
            
            // Update issue status to Spam
            issue.status = 'Spam';
            issue.timeline.push({
                status: 'Spam',
                message: `Spam detected: ${reason}`,
                byUser: 'System'
            });
            await issue.save();
            
            // Send notification to user
            await Notification.create({
                recipient: issue.reporter.toString(),
                title: 'Issue Flagged as Spam',
                message: `Your reported issue was flagged as spam. Reason: ${reason}. If this is a mistake, contact support.`,
                type: 'warning',
                relatedId: issueId
            });
            
            console.log(`Issue ${issueId} flagged as spam:`, reason);
        }
        
        // If uncertain, just flag for review (no notification)
        else if (confidence < 0.6) {
            const issue = await Issue.findById(issueId);
            if (!issue) return;
            
            issue.timeline.push({
                status: 'Flagged',
                message: `Auto-flagged for review: ${reason || 'Low confidence'}`,
                byUser: 'System'
            });
            await issue.save();
        }
        
    } catch (error) {
        console.error('Async validation error:', error.message);
        // Silently fail - issue already created
    }
}
```

### Option 2: Queue-Based (Better for scale)

If you have a job queue (Bull, BullMQ, etc.):

```javascript
// After creating issue
if (fileUrl) {
    await imageValidationQueue.add({
        issueId: issue._id,
        imageUrl: fileUrl,
        category: category
    });
}
```

---

## 🚨 FRONTEND: NO CHANGES NEEDED

**File**: `src/Pages/ReportIssue.jsx`

**Current behavior**: User submits → Shows success

**Keep it!** Don't add any validation blocking.

**What happens**:
1. User submits complaint → SUCCESS message shows
2. If spam detected (background) → User gets notification later
3. User can check notification panel to see spam flag

**Optional Enhancement** (not required):
If you want to show a generic processing message:
```javascript
toast.success('Issue submitted! We are reviewing it.');
```

---

## 📊 Issue Status Flow

```
User submits issue
    ↓
Status: "Pending" (default)
    ↓
Background validation runs
    ↓
If spam (confidence > 0.7):
    Status: "Spam"
    User notification: "Issue flagged as spam"
    
If uncertain (confidence < 0.6):
    Status: "Pending" + Flagged in timeline
    No notification (moderator reviews)
    
If valid:
    No change, normal flow continues
```

---

## 🔔 Notification System

**Backend needs to ensure**:
- User sees notification when issue flagged as spam
- Notification links to the issue
- User can appeal/contact support

**Example Notification**:
```json
{
  "title": "Issue Flagged as Spam",
  "message": "Your reported issue 'Pothole on Main St' was flagged as spam. Reason: Image shows food, not a civic issue. Contact support if this is incorrect.",
  "type": "warning",
  "relatedIssue": "issue_id_here"
}
```

---

## ✅ Summary for Backend Developer

**What to do**:
1. ✅ Accept and save issue FIRST (don't block on validation)
2. ✅ Call `validateImageAsync()` after saving (fire-and-forget)
3. ✅ If spam detected → Update issue status + send notification
4. ✅ If uncertain → Add to timeline (no notification)
5. ❌ DON'T block submission on validation

**What Frontend does**:
- Nothing! Just submit normally
- User gets notification later if spam

---

## 🧪 Testing

1. Submit issue with spam image (selfie, food)
2. Check database: Issue should be created immediately
3. Wait 2-3 seconds
4. Check again: Status should update to "Spam"
5. Check notifications: User should have notification

---

## 🎉 Benefits of Async Approach

- ✅ Fast user experience (no waiting)
- ✅ No blocking on ML service downtime
- ✅ Can process in bulk/queue
- ✅ User gets helpful notification if needed
- ✅ Better UX than rejection at upload
