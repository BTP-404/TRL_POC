const cds = require('@sap/cds');
const PDFDocument = require('pdfkit');

module.exports = cds.service.impl(async function () {
  const { QC_HEADER, QC_ITEM, QC_ATTACHMENTS, QC_TEST_TABLE } = this.entities;
  this.before('CREATE', QC_HEADER, async (req) => {
    if (req.data.DRAFT_FLAG === undefined) {
      req.data.DRAFT_FLAG = true;
    }

    const type = req.data.TYPE;

    if (!type || !['inlet', 'outlet'].includes(type.toLowerCase())) {
      return req.error(400, 'Please provide a valid "type": "inlet" or "outlet".');
    }

    const suffix = type.toLowerCase() === 'inlet' ? 'U' : 'D';
    const db = cds.transaction(req);

    // Set DATE_STARTED to current system date and time
    req.data.DATE_STARTED = new Date().toISOString();

    const result = await db.run(SELECT.from(QC_HEADER).columns('SNORKEL_NO'));

    let maxNum = 0;
    for (const row of result) {
      const match = row.SNORKEL_NO.match(/^(\d+)[UD]$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const nextNumber = String(maxNum + 1).padStart(4, '0') + suffix;
    req.data.SNORKEL_NO = nextNumber;

    delete req.data.type; // Ensure it's not stored
  });

this.on('generateQCReport', async (req) => {
  try {
    const { SNORKEL_NO } = req.data;
    const db = cds.transaction(req);

    const header = await db.run(SELECT.one.from('db.QC_HEADER').where({ SNORKEL_NO }));
    if (!header) return req.reject(404, `Header not found for ${SNORKEL_NO}`);

    let items = await db.run(
      SELECT.from('db.QC_ITEM')
        .where({ qC_HEADER_SNORKEL_NO: SNORKEL_NO })
        .columns(
          '*',
          { aTTACHMENTS: ['file', 'mimeType', 'name', 'sectionNo', 'question'] },
          { qc_TESTS: ['testname', 'actualvalue', 'specification', 'tolerance', 'remark'] }
        )
    ) || [];

    const headerAttachments = await db.run(
      SELECT.from('db.QC_ATTACHMENTS')
        .where({ 'qC_HEADER.SNORKEL_NO': SNORKEL_NO })
        .columns('name', 'file', 'mimeType', 'sectionNo', 'question')
    ) || [];

    const headerTests = await db.run(
      SELECT.from('db.QC_Test_Table')
        .where({ 'qC_HEADER.SNORKEL_NO': SNORKEL_NO })
        .columns(
          'sheetNo', 'actualvalue', 'date', 'ff', 'fluidity', 'method', 'no', 'position', 'powderweight',
          'remark', 'settleduration', 'spec', 'specification', 'testNo', 'testname', 'tf', 'tolerance',
          'vibration', 'watercasting'
        )
    ) || [];

    return new Promise((resolve, reject) => {
      try {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 40 });
        const buffers = [];
        const renderedImages = new Set();

        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => {
          const base64Content = Buffer.concat(buffers).toString('base64');
          resolve({
            filename: `QC_Report_${SNORKEL_NO}.pdf`,
            mimeType: 'application/pdf',
            content: base64Content
          });
        });

        const printFieldRow = (label, value) => {
          doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
          doc.font('Helvetica').text(value || '-');
        };

        // Header with yellow background
        doc.rect(40, 40, doc.page.width - 80, 25).fill('#FFFF99');
        doc.fillColor('black').fontSize(16).font('Helvetica-Bold')
           .text('Essar-A RH Snorkel Installation Record Sheet', 45, 45, { align: 'center' });
        doc.moveDown(2);
        doc.fillColor('black').fontSize(10);

        printFieldRow('Snorkel No', header.SNORKEL_NO);
        printFieldRow('Sheet No', header.SHEET_NO);
        printFieldRow('Date Started', header.DATE_STARTED);
        printFieldRow('Date Ended', header.DATE_ENDED);
        doc.moveDown();

        // Sort items by DATE_INSPECTED
        items = items.map(item => ({
          ...item,
          _cleanQuestion: item.QUESTION || '',
          _dateInspected: item.DATE_INSPECTED ? new Date(item.DATE_INSPECTED) : null
        })).filter(item => item._dateInspected !== null);

        items.sort((a, b) => a._dateInspected - b._dateInspected);

        // Render QC Items
        items.forEach(item => {
          doc.fontSize(12).fillColor('#0000CC').font('Helvetica-Bold')
            .text(`Section: ${item._cleanQuestion}`);
          doc.fillColor('black').font('Helvetica')
            .text(`Date Inspected: ${item._dateInspected.toLocaleDateString()}`);

          const fields = [
            ['Inspected By', item.INSPECTED_BY],
            ['Method', item.METHOD],
            ['Actual Value', item.ACTUAL_VALUE],
            ['Tolerance', item.TOLERANCE],
            ['Comments', item.COMMENTS],
            ['Corrective Action', item.CORRECTIVE_ACTION]
          ];

          fields.forEach(([label, val]) => {
            if (val !== null && val !== undefined && val !== '') {
              printFieldRow(label, val);
            }
          });

          // Special coloring for Decision Taken
          if (item.DECISION_TAKEN) {
            doc.font('Helvetica-Bold').text('Decision Taken: ', { continued: true });
            doc.fillColor(item.DECISION_TAKEN.toLowerCase() === 'ok' ? 'green' : 'red')
              .text(item.DECISION_TAKEN);
            doc.fillColor('black');
          }

          doc.moveDown();
          doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#999999').stroke();
          doc.moveDown();
        });

        // Group and Render Tests
        const groupedTests = headerTests.reduce((acc, test) => {
          const { testname } = test;
          if (!testname) return acc;
          if (!acc[testname]) acc[testname] = [];
          acc[testname].push(test);
          return acc;
        }, {});

        Object.entries(groupedTests).forEach(([testName, tests]) => {
          doc.fontSize(12).fillColor('#0000CC').font('Helvetica-Bold')
            .text(`Test: ${testName}`);
          doc.fillColor('black').font('Helvetica');

          tests.forEach(test => {
            const testFields = [
              ['Test No', test.testNo],
              ['Sheet No', test.sheetNo],
              ['Date', test.date ? new Date(test.date).toLocaleDateString() : '-'],
              ['Specification', test.specification],
              ['Actual Value', test.actualvalue],
              ['Tolerance', test.tolerance],
              ['Remark', test.remark],
              ['Fluidity', test.fluidity],
              ['Vibration', test.vibration],
              ['Water Casting', test.watercasting],
              ['FF', test.ff],
              ['Position', test.position],
              ['Powder Weight', test.powderweight],
              ['Settled Duration', test.settleduration],
              ['Spec', test.spec],
              ['TF', test.tf],
              ['No', test.no],
              ['Test Method', test.method],
            ];

            testFields.forEach(([label, val]) => {
              if (val !== null && val !== undefined && val !== '') {
                printFieldRow(label, val);
              }
            });

            doc.moveDown();
          });

          doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#999999').stroke();
          doc.moveDown();
        });

        // Render Images
        headerAttachments.forEach(att => {
          if (!renderedImages.has(att.file)) {
            doc.fontSize(12).fillColor('#0000CC').font('Helvetica-Bold')
              .text(`Section: ${att.sectionNo || '-'}`);
            doc.font('Helvetica').fillColor('black')
              .text(`Question: ${att.question || '-'}`);

            try {
              const buffer = Buffer.from(att.file, 'base64');
              doc.image(buffer, { fit: [300, 200], align: 'center' });
              renderedImages.add(att.file);
            } catch {
              doc.fontSize(9).fillColor('red').text('Image error').fillColor('black');
            }

            doc.moveDown();
            doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#999999').stroke();
            doc.moveDown();
          }
        });

        doc.end();
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        reject(new Error('Failed to generate PDF'));
      }
    });
  } catch (err) {
    console.error('Error in generateQCReport:', err);
    req.reject(500, 'Internal Server Error while generating QC Report');
  }
});

  
});
