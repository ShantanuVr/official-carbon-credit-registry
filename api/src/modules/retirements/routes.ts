import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../index'
import { AppError, ErrorCodes } from '../../lib/errors'
import { authenticate, AuthenticatedRequest } from '../../lib/auth'
import puppeteer from 'puppeteer'

export async function retirementRoutes(fastify: FastifyInstance) {
  // Get retirement certificate
  fastify.get('/:certificateId', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { certificateId: string }

    const retirement = await prisma.retirement.findUnique({
      where: { certificateId: params.certificateId },
      include: {
        organization: true,
        batch: {
          include: {
            project: {
              include: {
                organization: true,
              },
            },
            issuanceRequest: true,
          },
        },
      },
    })

    if (!retirement) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Retirement certificate not found', 404)
    }

    // Check if client wants HTML or JSON
    const acceptHeader = request.headers.accept || ''
    if (acceptHeader.includes('application/json')) {
      return {
        authority: "credit",
        watermark: {
          authority: "CREDIT — OFF‑CHAIN",
          issuedBy: "Official Registry (Demo)"
        },
        ...retirement,
        tokenization: {
          status: "NOT_REQUESTED"
        }
      }
    }

    // Generate certificate HTML
    const certificateHtml = generateCertificateHtml(retirement)

    // Set content type for HTML
    reply.type('text/html')
    return certificateHtml
  })

  // Generate PDF certificate
  fastify.get('/:certificateId/pdf', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { certificateId: string }

    const retirement = await prisma.retirement.findUnique({
      where: { certificateId: params.certificateId },
      include: {
        organization: true,
        batch: {
          include: {
            project: {
              include: {
                organization: true,
              },
            },
            issuanceRequest: true,
          },
        },
      },
    })

    if (!retirement) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Retirement certificate not found', 404)
    }

    // Generate PDF
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    
    const certificateHtml = generateCertificateHtml(retirement)
    await page.setContent(certificateHtml)
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    })
    
    await browser.close()

    reply.type('application/pdf')
    reply.header('Content-Disposition', `attachment; filename="retirement-certificate-${params.certificateId}.pdf"`)
    return pdf
  })
}

function generateCertificateHtml(retirement: any): string {
  const { batch, organization } = retirement
  const { project, issuanceRequest } = batch

  // Format serial range
  const formatSerialRange = (start: number, end: number) => {
    if (start === end) {
      return `${start.toString().padStart(8, '0')}`
    }
    return `${start.toString().padStart(8, '0')}-${end.toString().padStart(8, '0')}`
  }

  // Generate human-readable serial format
  const generateHumanReadableSerial = (projectCode: string, vintageStart: number, vintageEnd: number, batchId: string, startSerial: number, endSerial: number) => {
    const batchCode = batchId.slice(-4).toUpperCase()
    const serialStart = startSerial.toString().padStart(8, '0')
    const serialEnd = endSerial.toString().padStart(8, '0')
    
    return `SIM-REG-${projectCode}-${vintageStart}-${vintageEnd}-${batchCode}-${serialStart}-${serialEnd}`
  }

  const projectCode = project.title.replace(/\s+/g, '').substring(0, 8).toUpperCase()
  const serialRange = formatSerialRange(retirement.serialStart, retirement.serialEnd)
  const humanReadableSerial = generateHumanReadableSerial(
    projectCode,
    batch.vintageStart,
    batch.vintageEnd,
    batch.id,
    retirement.serialStart,
    retirement.serialEnd
  )

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carbon Credit Retirement Certificate</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background-color: #f8f9fa;
        }
        .certificate {
            background: white;
            padding: 60px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border: 3px solid #28a745;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .title {
            font-size: 32px;
            font-weight: bold;
            color: #28a745;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 18px;
            color: #6c757d;
        }
        .content {
            margin: 40px 0;
        }
        .field {
            margin: 20px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-left: 4px solid #28a745;
        }
        .field-label {
            font-weight: bold;
            color: #495057;
            margin-bottom: 5px;
        }
        .field-value {
            color: #212529;
            font-size: 16px;
        }
        .footer {
            margin-top: 60px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        .qr-code {
            text-align: center;
            margin: 30px 0;
        }
        .certificate-id {
            font-family: monospace;
            background-color: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <div class="title">🌱 Carbon Credit Retirement Certificate</div>
            <div class="subtitle">Official Carbon Credit Registry</div>
        </div>

        <div class="content">
            <div class="field">
                <div class="field-label">Certificate ID</div>
                <div class="certificate-id">${retirement.certificateId}</div>
            </div>

            <div class="field">
                <div class="field-label">Project</div>
                <div class="field-value">${project.title}</div>
            </div>

            <div class="field">
                <div class="field-label">Project Description</div>
                <div class="field-value">${project.description}</div>
            </div>

            <div class="field">
                <div class="field-label">Vintage Period</div>
                <div class="field-value">${batch.vintageStart} - ${batch.vintageEnd}</div>
            </div>

            <div class="field">
                <div class="field-label">Credits Retired</div>
                <div class="field-value">${retirement.quantity.toLocaleString()} tCO₂e</div>
            </div>

            <div class="field">
                <div class="field-label">Serial Range</div>
                <div class="field-value" style="font-family: monospace; font-size: 16px; font-weight: bold;">${serialRange}</div>
            </div>

            <div class="field">
                <div class="field-label">Unique Serial Identifier</div>
                <div class="field-value" style="font-family: monospace; font-size: 12px; background-color: #f8f9fa; padding: 8px; border-radius: 4px; word-break: break-all;">${humanReadableSerial}</div>
            </div>

            <div class="field">
                <div class="field-label">Retirement Purpose</div>
                <div class="field-value">${retirement.purpose}</div>
            </div>

            ${retirement.beneficiary ? `
            <div class="field">
                <div class="field-label">Beneficiary</div>
                <div class="field-value">${retirement.beneficiary}</div>
            </div>
            ` : ''}

            <div class="field">
                <div class="field-label">Retiring Organization</div>
                <div class="field-value">${organization.name}</div>
            </div>

            <div class="field">
                <div class="field-label">Retirement Date</div>
                <div class="field-value">${new Date(retirement.createdAt).toLocaleDateString()}</div>
            </div>

            ${issuanceRequest?.onchainHash ? `
            <div class="field">
                <div class="field-label">On-Chain Hash</div>
                <div class="field-value" style="font-family: monospace; font-size: 12px;">${issuanceRequest.onchainHash}</div>
            </div>
            ` : ''}

            ${issuanceRequest?.factorRef ? `
            <div class="field">
                <div class="field-label">Factor Reference</div>
                <div class="field-value">${issuanceRequest.factorRef}</div>
            </div>
            ` : ''}
        </div>

        <div class="qr-code">
            <div style="width: 120px; height: 120px; background-color: #e9ecef; margin: 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                QR Code<br>
                <small>${retirement.certificateId}</small>
            </div>
        </div>

        <div class="footer">
            <div style="background-color: #d4edda; border: 2px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 8px; text-align: center;">
                <div style="font-weight: bold; color: #155724; font-size: 16px;">📜 CREDIT — OFF‑CHAIN</div>
                <div style="color: #155724; font-size: 14px; margin-top: 5px;">Source of Record: Official Registry (Demo)</div>
            </div>
            <p>This certificate verifies the permanent retirement of carbon credits from the Official Carbon Credit Registry.</p>
            <p>Certificate ID: ${retirement.certificateId} | Generated: ${new Date().toISOString()}</p>
            <p style="font-size: 12px; color: #6c757d; margin-top: 20px;">
                <strong>Authority:</strong> Credit (Off-chain) | 
                <strong>Tokenization:</strong> Representational only | 
                <strong>Registry:</strong> Authoritative source
            </p>
        </div>
    </div>
</body>
</html>
  `
}
