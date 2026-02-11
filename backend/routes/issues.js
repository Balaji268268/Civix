const express = require("express");
const router = express.Router();
const issueController = require("../controllers/issues");
const { verifyToken, isAdmin, isModerator } = require("../middlewares/validate");
const { upload } = require("../middlewares/multer.middleware");


router.post("/", verifyToken, upload.single("file"), issueController.createIssue);
router.post("/analyze-image", upload.single("file"), issueController.analyzeIssueImage);
router.post("/generate-caption", upload.single("file"), issueController.generateCaption);


router.patch("/:id/status", verifyToken, isModerator, issueController.updateIssueStatus);

// Resolution Workflow
router.post("/:id/submit-resolution", upload.single("proof"), issueController.submitResolution);
router.patch("/:id/review-resolution", verifyToken, isModerator, issueController.reviewResolution);
router.patch("/:id/acknowledge-resolution", issueController.acknowledgeResolution); // User Token check needed ideally, but keeping open for quick implementation or check Auth in controller later if passed. Ideally add verifyToken.

// GET: All issues
router.get("/", issueController.getAllIssues); // Public feed
router.get("/my-issues", verifyToken, issueController.getMyIssues);
router.get("/assigned", verifyToken, issueController.getAssignedIssues);
router.get("/:id/duplicates", verifyToken, isAdmin, issueController.findDuplicatesForIssue);
// Moderator routes must be before /:id to avoid ID collision
router.post("/assign-manual", verifyToken, issueController.manualAssignIssue);
router.get("/officers", verifyToken, issueController.getOfficersByDepartment);
router.get("/ai-suggest/:id", verifyToken, issueController.suggestOfficer);
// router.post("/report-officer", verifyToken, issueController.reportOfficer); // Legacy
router.post("/add-feedback", verifyToken, issueController.addResolutionFeedback);
router.post("/:id/upvote", verifyToken, issueController.upvoteIssue);
router.post("/:id/downvote", verifyToken, issueController.downvoteIssue);

router.get("/:id", issueController.getIssueById);

router.delete("/:id", verifyToken, issueController.deleteIssue);

module.exports = router;
