// Simple verification script to check notifications

const BASE_URL = 'http://localhost:3000';

async function verifyNotifications() {
  console.log('🔔 Verifying Notification System...\n');

  try {
    // Check notifications
    console.log('📊 Fetching notifications...');
    const response = await fetch(`${BASE_URL}/api/notifications?doctorId=68d131bf0d6f12b157808929&limit=10`);
    const data = await response.json();
    
    if (!data.success) {
      console.log('❌ Failed to fetch notifications:', data.error);
      return;
    }

    console.log(`✅ Found ${data.count} notifications\n`);

    if (data.notifications && data.notifications.length > 0) {
      console.log('📋 Recent Notifications:');
      data.notifications.slice(0, 5).forEach((notification, index) => {
        const timeAgo = getTimeAgo(new Date(notification.createdAt));
        console.log(`\n${index + 1}. 📧 [${notification.type.toUpperCase()}]`);
        console.log(`   👤 Patient: ${notification.patientName}`);
        console.log(`   👨‍⚕️ Doctor: ${notification.doctorName}`);
        console.log(`   📅 Date: ${notification.appointmentDate} at ${notification.appointmentTime}`);
        console.log(`   💬 Message: ${notification.message}`);
        console.log(`   📊 Status: ${notification.status}`);
        console.log(`   ⏰ Created: ${timeAgo}`);
        if (notification.rejectionReason) {
          console.log(`   ❌ Rejection Reason: ${notification.rejectionReason}`);
        }
      });
    } else {
      console.log('📭 No notifications found.');
    }

    console.log('\n🎉 Notification verification completed!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return date.toLocaleString();
}

// Run verification
verifyNotifications();