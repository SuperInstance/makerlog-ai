/**
 * Test script to verify user auto-creation and task creation
 *
 * This tests the fix for the FOREIGN KEY constraint error (1042)
 * by ensuring users are automatically created when needed.
 */

const API_URL = 'http://localhost:8787'; // Change to deployed URL for testing

async function testTaskCreation() {
  console.log('Testing task creation with user auto-creation...\n');

  const testUserId = 'test-user-' + Date.now();
  console.log(`Test User ID: ${testUserId}\n`);

  // Test 1: Create a task (should auto-create user)
  console.log('Test 1: Creating task (should auto-create user)...');
  const createTaskResponse = await fetch(`${API_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': testUserId,
    },
    body: JSON.stringify({
      type: 'text-gen',
      prompt: 'Test task for user auto-creation',
      priority: 1,
    }),
  });

  console.log('Status:', createTaskResponse.status);
  const taskData = await createTaskResponse.json();
  console.log('Response:', JSON.stringify(taskData, null, 2));

  if (createTaskResponse.ok) {
    console.log('✅ Task created successfully!\n');
  } else {
    console.log('❌ Task creation failed!\n');
    return;
  }

  // Test 2: Verify user exists
  console.log('Test 2: Verifying user exists...');
  const userResponse = await fetch(`${API_URL}/api/users/me`, {
    headers: {
      'X-User-Id': testUserId,
    },
  });

  console.log('Status:', userResponse.status);
  const userData = await userResponse.json();
  console.log('Response:', JSON.stringify(userData, null, 2));

  if (userResponse.ok && userData.id) {
    console.log('✅ User exists!\n');
  } else {
    console.log('❌ User does not exist!\n');
  }

  // Test 3: Get quota (should work with auto-created user)
  console.log('Test 3: Getting quota (tests user auto-creation)...');
  const quotaResponse = await fetch(`${API_URL}/api/quota`, {
    headers: {
      'X-User-Id': testUserId,
    },
  });

  console.log('Status:', quotaResponse.status);
  const quotaData = await quotaResponse.json();
  console.log('Response:', JSON.stringify(quotaData, null, 2));

  if (quotaResponse.ok) {
    console.log('✅ Quota endpoint works!\n');
  } else {
    console.log('❌ Quota endpoint failed!\n');
  }

  // Test 4: Get tasks (should return the created task)
  console.log('Test 4: Getting tasks for user...');
  const tasksResponse = await fetch(`${API_URL}/api/tasks`, {
    headers: {
      'X-User-Id': testUserId,
    },
  });

  console.log('Status:', tasksResponse.status);
  const tasksData = await tasksResponse.json();
  console.log('Response:', JSON.stringify(tasksData, null, 2));

  if (tasksResponse.ok && tasksData.tasks && tasksData.tasks.length > 0) {
    console.log('✅ Tasks retrieved successfully!\n');
  } else {
    console.log('❌ Tasks retrieval failed!\n');
  }

  // Test 5: Get achievements (should work with auto-created user)
  console.log('Test 5: Getting achievements...');
  const achievementsResponse = await fetch(`${API_URL}/api/achievements`, {
    headers: {
      'X-User-Id': testUserId,
    },
  });

  console.log('Status:', achievementsResponse.status);
  const achievementsData = await achievementsResponse.json();
  console.log('Response:', JSON.stringify(achievementsData, null, 2));

  if (achievementsResponse.ok) {
    console.log('✅ Achievements endpoint works!\n');
  } else {
    console.log('❌ Achievements endpoint failed!\n');
  }

  console.log('\n=== Test Summary ===');
  console.log('All tests completed. Check results above.');
  console.log(`\nTest User ID: ${testUserId}`);
  console.log('You can clean up this test user from the database if needed.');
}

// Run tests
testTaskCreation().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
