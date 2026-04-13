const { Document } = require("../models/Document");
const { AuditLog } = require("../models/AuditLog");
const { logAction } = require("./auditController");

async function clearData(req, res, next) {
  try {
    const { type } = req.query; // 'documents', 'logs', or 'all'
    
    let result = { message: "Nothing cleared." };
    
    if (type === 'documents' || type === 'all') {
      const docRes = await Document.deleteMany({});
      result.documents = docRes.deletedCount;
    }
    
    if (type === 'logs' || type === 'all') {
      const logRes = await AuditLog.deleteMany({});
      result.logs = logRes.deletedCount;
    }
    
    await logAction({
      userId: req.auth.userId,
      action: "System Cleanup",
      details: `Admin cleared ${type || 'partial'} data from the system.`,
      type: "warning",
    });

    return res.status(200).json({ 
      success: true, 
      message: "Data cleared successfully.",
      counts: result
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { clearData };
