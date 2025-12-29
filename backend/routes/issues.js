const express = require("express");
const router = express.Router();
const issueController = require("../controllers/issues");
const { verifyToken, isAdmin, isModerator } = require("../middlewares/validate");
const { upload } = require("../middlewares/multer.middleware");


router.post("/", upload.single("file"), issueController.createIssue);


router.patch("/:id/status", verifyToken, isModerator, issueController.updateIssueStatus);

// GET: All issues
router.get("/", issueController.getAllIssues);
router.get("/my-issues", issueController.getMyIssues);
router.get("/assigned", verifyToken, issueController.getAssignedIssues);
router.get("/:id/duplicates", verifyToken, isAdmin, issueController.findDuplicatesForIssue);
// Moderator routes must be before /:id to avoid ID collision
router.post("/assign-manual", verifyToken, issueController.manualAssignIssue);
router.get("/officers", verifyToken, issueController.getOfficersByDepartment);

router.get("/:id", issueController.getIssueById);

module.exports = router;
