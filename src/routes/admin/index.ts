import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/adminAuth.middleware';
import adminCategoryRoutes from './category.routes';
import adminSkillRoutes from './skill.routes';
import { dashboardController } from '../../controllers/admin/dashboard.controller';
import { adminUserController } from '../../controllers/admin/user.controller';
import { adminJobController } from '../../controllers/admin/job.controller';
import { adminApplicationController } from '../../controllers/admin/application.controller';
import { adminLogsController } from '../../controllers/admin/logs.controller';
import { adminReportController } from '../../controllers/admin/report.controller';
import { adminSettingsController } from '../../controllers/admin/settings.controller';
import { monitoringController } from '../../controllers/admin/monitoring.controller';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Dashboard routes
router.get('/dashboard', dashboardController.getDashboard.bind(dashboardController));
router.get('/activity', dashboardController.getActivity.bind(dashboardController));
router.get('/chart', dashboardController.getChartData.bind(dashboardController));
router.get('/top-employers', dashboardController.getTopEmployers.bind(dashboardController));

// User management routes
router.get('/users', adminUserController.getUsers.bind(adminUserController));
router.get('/users/:id', adminUserController.getUser.bind(adminUserController));
router.patch('/users/:id', adminUserController.updateUser.bind(adminUserController));
router.post('/users/:id/suspend', adminUserController.suspendUser.bind(adminUserController));
router.post('/users/:id/unsuspend', adminUserController.unsuspendUser.bind(adminUserController));
router.post('/users/:id/ban', adminUserController.banUser.bind(adminUserController));
router.delete('/users/:id', adminUserController.deleteUser.bind(adminUserController));

// Job management routes
router.get('/jobs', adminJobController.getJobs.bind(adminJobController));
router.get('/jobs/:id', adminJobController.getJob.bind(adminJobController));
router.patch('/jobs/:id', adminJobController.updateJob.bind(adminJobController));
router.post('/jobs/:id/approve', adminJobController.approveJob.bind(adminJobController));
router.post('/jobs/:id/reject', adminJobController.rejectJob.bind(adminJobController));
router.delete('/jobs/:id', adminJobController.deleteJob.bind(adminJobController));
router.post('/jobs/bulk-approve', adminJobController.bulkApproveJobs.bind(adminJobController));

// Application management routes
router.get('/applications', adminApplicationController.getApplications.bind(adminApplicationController));
router.get('/applications/:id', adminApplicationController.getApplication.bind(adminApplicationController));

// Report management routes
router.get('/reports', adminReportController.getReports.bind(adminReportController));
router.get('/reports/:id', adminReportController.getReport.bind(adminReportController));
router.patch('/reports/:id', adminReportController.updateReport.bind(adminReportController));
router.post('/reports/:id/action', adminReportController.takeAction.bind(adminReportController));
router.post('/reports/bulk-resolve', adminReportController.bulkResolve.bind(adminReportController));

// Settings management routes
router.get('/settings', adminSettingsController.getAllSettings.bind(adminSettingsController));
router.get('/settings/maintenance', adminSettingsController.getMaintenanceStatus.bind(adminSettingsController));
router.put('/settings/maintenance', adminSettingsController.toggleMaintenance.bind(adminSettingsController));
router.post('/settings/reload', adminSettingsController.reloadSettings.bind(adminSettingsController));
router.post('/settings/initialize', adminSettingsController.initializeSettings.bind(adminSettingsController));
router.get('/settings/:key', adminSettingsController.getSetting.bind(adminSettingsController));
router.put('/settings/:key', adminSettingsController.updateSetting.bind(adminSettingsController));

// Admin logs
router.get('/logs', adminLogsController.getLogs.bind(adminLogsController));

// System monitoring routes
router.get('/monitoring/system', monitoringController.getSystemOverview.bind(monitoringController));
router.get('/monitoring/api-metrics', monitoringController.getApiMetrics.bind(monitoringController));
router.get('/monitoring/endpoints', monitoringController.getEndpointMetrics.bind(monitoringController));
router.get('/monitoring/endpoints/slowest', monitoringController.getSlowestEndpoints.bind(monitoringController));
router.get('/monitoring/errors', monitoringController.getErrors.bind(monitoringController));
router.get('/monitoring/errors/trends', monitoringController.getErrorTrends.bind(monitoringController));
router.get('/monitoring/errors/by-type', monitoringController.getErrorsByType.bind(monitoringController));
router.get('/monitoring/queries', monitoringController.getQueryAnalytics.bind(monitoringController));
router.get('/monitoring/logs', monitoringController.getLogs.bind(monitoringController));

// Category & skill management (existing routes)
router.use('/categories', adminCategoryRoutes);
router.use('/skills', adminSkillRoutes);

export default router;
