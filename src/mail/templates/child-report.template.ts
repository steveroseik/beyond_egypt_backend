import { type } from 'os';
import { ChildReportHistory } from 'src/child-report-history/entities/child-report-history.entity';
import { ChildReport } from 'src/child-report/entities/child-report.entity';
import { ChildReportStatus, ChildReportType } from 'support/enums';
import { EmailTemplate } from '../interface/email-template';
import { StatusInfo } from '../interface/status-info';

export function generateReportEmail({
  childReport,
  latestHistory,
  parentName,
  childName,
  campName,
  reportViewUrl,
}: {
  childReport: ChildReport;
  latestHistory: ChildReportHistory;
  parentName: string;
  childName: string;
  campName: string;
  reportViewUrl: string;
}): EmailTemplate {
  const isInitialReport = latestHistory.status === ChildReportStatus.new;
  const reportTypeLabel = getReportTypeLabel(childReport.type);
  const statusInfo = getStatusInfo(latestHistory.status);
  const formattedDate = formatDate(latestHistory.reportTime);
  const formattedTime = formatTime(latestHistory.reportTime);

  const subject = isInitialReport
    ? `Camp ${reportTypeLabel} Report - ${childName}`
    : `Camp Report Update (${statusInfo.label}) - ${childName}`;

  const introText = isInitialReport
    ? `We wanted to inform you that a ${reportTypeLabel.toLowerCase()} report has been ${statusInfo.action} for ${childName} during today's camp activities.`
    : `We're writing to provide you with an update on the ${reportTypeLabel.toLowerCase()} report for ${childName}. The report has been ${statusInfo.action}.`;

  const closingText =
    latestHistory.status === ChildReportStatus.closed
      ? 'This matter has been resolved and is now closed. Thank you for your understanding and support throughout this process.'
      : statusInfo.needsFollowUp
        ? "We will continue to monitor the situation and will keep you informed of any further developments. Your child's safety and well-being are our top priority."
        : 'We consider this matter resolved. Thank you for your understanding and support.';

  return {
    subject,
    htmlContent: generateHtmlContent(
      parentName,
      childName,
      campName,
      latestHistory,
      reportTypeLabel,
      statusInfo,
      isInitialReport,
      formattedDate,
      formattedTime,
      introText,
      closingText,
      reportViewUrl,
    ),
    // textContent: generateTextContent(
    //   parentName,
    //   childName,
    //   campName,
    //   latestHistory,
    //   reportTypeLabel,
    //   statusInfo,
    //   isInitialReport,
    //   formattedDate,
    //   formattedTime,
    //   introText,
    //   closingText,
    //   reportViewUrl,
    // ),
  };
}

function generateHtmlContent(
  parentName: string,
  childName: string,
  campName: string,
  latestHistory: ChildReportHistory,
  reportTypeLabel: string,
  statusInfo: StatusInfo,
  isInitialReport: boolean,
  formattedDate: string,
  formattedTime: string,
  introText: string,
  closingText: string,
  reportViewUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Camp Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .email-container {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 25px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-top: 10px;
            background-color: ${statusInfo.color};
            color: white;
        }
        .content {
            padding: 30px 25px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .report-summary {
            background-color: #f8f9fa;
            border-left: 4px solid ${statusInfo.color};
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .report-details {
            margin: 25px 0;
        }
        .detail-row {
            display: flex;
            margin-bottom: 12px;
            align-items: flex-start;
        }
        .detail-label {
            font-weight: 600;
            color: #555;
            min-width: 120px;
            margin-right: 10px;
        }
        .detail-value {
            flex: 1;
            color: #333;
        }
        .actions-section {
            background-color: #e8f5e8;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .actions-title {
            font-weight: 600;
            color: #2d5a2d;
            margin-bottom: 10px;
        }
        .game-info {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 12px;
            margin: 15px 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px 25px;
            text-align: center;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #6c757d;
        }
        .view-report-btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
            transition: transform 0.2s ease;
        }
        .view-report-btn:hover {
            transform: translateY(-2px);
        }
        .contact-info {
            margin-top: 15px;
            font-size: 13px;
        }
            body {
                padding: 10px;
            }
            .detail-row {
                flex-direction: column;
            }
            .detail-label {
                min-width: auto;
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>${isInitialReport ? 'Camp Report' : 'Camp Report Update'}</h1>
            <div class="status-badge">${statusInfo.label}</div>
        </div>
        
        <div class="content">
            <div class="greeting">
                Dear ${parentName},
            </div>
            
            <p>${introText}</p>
            
            <div class="report-summary">
                <div class="detail-row">
                    <span class="detail-label">Child:</span>
                    <span class="detail-value">${childName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Camp:</span>
                    <span class="detail-value">${campName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Report Type:</span>
                    <span class="detail-value">${reportTypeLabel}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date & Time:</span>
                    <span class="detail-value">${formattedDate} at ${formattedTime}</span>
                </div>
                ${
                  latestHistory.gameName
                    ? `
                <div class="game-info">
                    <strong>Activity:</strong> ${latestHistory.gameName}
                </div>
                `
                    : ''
                }
            </div>
            
            <div class="report-details">
                <h3 style="color: #333; margin-bottom: 15px;">Summary</h3>
                <p style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 0;">
                    ${
                      latestHistory.details.length > 150
                        ? latestHistory.details
                            .substring(0, 150)
                            .replace(/\n/g, '<br>') + '...'
                        : latestHistory.details.replace(/\n/g, '<br>')
                    }
                </p>
                
                <div style="text-align: center; margin: 25px 0;">
                    <a href="${reportViewUrl}" class="view-report-btn">View Full Report</a>
                </div>
                
                <p style="font-size: 14px; color: #666; text-align: center; margin: 10px 0;">
                    Click above to view complete details, actions taken, and any attachments
                </p>
            </div>
            
            <p style="margin-top: 25px; color: #555;">${closingText}</p>
        </div>
        
        <div class="footer">
            <p style="margin: 0; font-weight: 600;">Our Camp Team</p>
            <div class="contact-info">
                If you have any questions or concerns, please don't hesitate to contact us.<br>
                We're here to ensure your child has the best possible camp experience.
            </div>
        </div>
    </div>
</body>
</html>`;
}

function generateTextContent(
  parentName: string,
  childName: string,
  campName: string,
  latestHistory: ChildReportHistory,
  reportTypeLabel: string,
  statusInfo: StatusInfo,
  isInitialReport: boolean,
  formattedDate: string,
  formattedTime: string,
  introText: string,
  closingText: string,
  reportViewUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Camp Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .email-container {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 25px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-top: 10px;
            background-color: ${statusInfo.color};
            color: white;
        }
        .content {
            padding: 30px 25px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .report-summary {
            background-color: #f8f9fa;
            border-left: 4px solid ${statusInfo.color};
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .detail-row {
            display: flex;
            margin-bottom: 12px;
            align-items: flex-start;
        }
        .detail-label {
            font-weight: 600;
            color: #555;
            min-width: 120px;
            margin-right: 10px;
        }
        .detail-value {
            flex: 1;
            color: #333;
        }
        .game-info {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 12px;
            margin: 15px 0;
        }
        .summary-section {
            margin: 25px 0;
        }
        .view-report-btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px 25px;
            text-align: center;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #6c757d;
        }
        .contact-info {
            margin-top: 15px;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>${isInitialReport ? 'Camp Report' : 'Camp Report Update'}</h1>
            <div class="status-badge">${statusInfo.label}</div>
        </div>
        
        <div class="content">
            <div class="greeting">
                Dear ${parentName},
            </div>
            
            <p>${introText}</p>
            
            <div class="report-summary">
                <div class="detail-row">
                    <span class="detail-label">Child:</span>
                    <span class="detail-value">${childName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Camp:</span>
                    <span class="detail-value">${campName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Report Type:</span>
                    <span class="detail-value">${reportTypeLabel}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date & Time:</span>
                    <span class="detail-value">${formattedDate} at ${formattedTime}</span>
                </div>
                ${
                  latestHistory.gameName
                    ? `
                <div class="game-info">
                    <strong>Activity:</strong> ${latestHistory.gameName}
                </div>
                `
                    : ''
                }
            </div>
            
            <div class="summary-section">
                <h3 style="color: #333; margin-bottom: 15px;">Summary</h3>
                <p style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 0;">
                    ${
                      latestHistory.details.length > 150
                        ? latestHistory.details.substring(0, 150) + '...'
                        : latestHistory.details
                    }
                </p>
                
                <div style="text-align: center; margin: 25px 0;">
                    <a href="${reportViewUrl}" class="view-report-btn">View Full Report</a>
                </div>
                
                <p style="font-size: 14px; color: #666; text-align: center; margin: 10px 0;">
                    For complete details, actions taken, and any attachments, please visit the link above.
                </p>
            </div>
            
            <p style="margin-top: 25px; color: #555;">${closingText}</p>
        </div>
        
        <div class="footer">
            <p style="margin: 0; font-weight: 600;">Our Camp Team</p>
            <div class="contact-info">
                If you have any questions or concerns, please don't hesitate to contact us.<br>
                We're here to ensure your child has the best possible camp experience.
            </div>
        </div>
    </div>
</body>
</html>
`;
}

function getReportTypeLabel(type: ChildReportType): string {
  return type === ChildReportType.incident ? 'Incident' : 'General';
}

function getStatusInfo(status: ChildReportStatus): StatusInfo {
  const statusMap = {
    [ChildReportStatus.new]: {
      label: 'New Report',
      color: '#007bff',
      action: 'created',
      needsFollowUp: true,
    },
    [ChildReportStatus.followUp]: {
      label: 'Follow-up',
      color: '#ffc107',
      action: 'updated with follow-up information',
      needsFollowUp: true,
    },
    [ChildReportStatus.closed]: {
      label: 'Resolved & Closed',
      color: '#28a745',
      action: 'resolved and closed',
      needsFollowUp: false,
    },
  };

  return (
    statusMap[status] || {
      label: 'Updated',
      color: '#17a2b8',
      action: 'updated',
      needsFollowUp: true,
    }
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}
