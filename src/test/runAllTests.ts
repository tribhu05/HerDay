import { runPhase2Verification } from './verifyGemmaAndWorkflow';
import { runVoiceVerification } from './verifyVoiceWorkflow';
import { runMongoVerification } from './verifyMongoPersistence';

async function runAllTests() {
  console.log('\n============================================================');
  console.log('       HERDAY UNIFIED AUTOMATED TEST SUITE EXECUTION        ');
  console.log('============================================================\n');

  try {
    console.log('>>> [SUITE 1/3]: Gemma Integration & Core Workflow Tests\n');
    await runPhase2Verification();

    console.log('\n------------------------------------------------------------\n');
    console.log('>>> [SUITE 2/3]: ElevenLabs Scribe Voice Layer Tests\n');
    await runVoiceVerification();

    console.log('\n------------------------------------------------------------\n');
    console.log('>>> [SUITE 3/3]: MongoDB Atlas Persistence & Local Fallback Tests\n');
    await runMongoVerification();

    console.log('\n============================================================');
    console.log(' 🎉 ALL TEST SUITES (GEMMA + VOICE + MONGO + PLANNER) PASSED! 🎉 ');
    console.log('============================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test execution failed with error:', error);
    process.exit(1);
  }
}

runAllTests();
