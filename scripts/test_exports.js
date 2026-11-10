const { exportCampaignToPDF, exportCampaignToDOCX } = require('../src/utils/campaignExport.ts');

async function testExport() {
  console.log('Testing PDF and DOCX export generation...');
  const sampleData = {
    name: 'Mega Onboarding Drive 2026',
    description: 'Special outreach campaign across major commercial hubs',
    startDate: '2026-11-15',
    startTime: '09:00',
    endDate: '2026-11-20',
    endTime: '18:00',
    volunteerCount: 3,
    volunteers: [
      {
        serialNumber: 1,
        volunteerName: 'Rahul Varma',
        mobileNumber: '9847123456',
        referralCode: 'CMP-7X9B2K',
        assignedDate: '2026-11-15',
        assignedStartTime: '09:00',
        assignedEndTime: '13:00'
      },
      {
        serialNumber: 2,
        volunteerName: 'Ananya Nair',
        mobileNumber: '9847654321',
        referralCode: 'CMP-3P4M9T',
        assignedDate: '2026-11-16',
        assignedStartTime: '14:00',
        assignedEndTime: '18:00'
      },
      {
        serialNumber: 3,
        volunteerName: 'Sanjay Kumar',
        mobileNumber: '9745112233',
        referralCode: 'CMP-9L8Q1Z',
        assignedDate: '2026-11-17',
        assignedStartTime: '10:00',
        assignedEndTime: '16:00'
      }
    ]
  };

  const pdfBlob = exportCampaignToPDF(sampleData);
  console.log('PDF Blob generated successfully! Size:', pdfBlob.size);

  const docxBlob = await exportCampaignToDOCX(sampleData);
  console.log('DOCX Blob generated successfully! Size:', docxBlob.size);

  console.log('ALL EXPORT TESTS PASSED!');
}

testExport().catch(console.error);
