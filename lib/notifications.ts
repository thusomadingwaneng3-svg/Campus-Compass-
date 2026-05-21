import * as Notifications from 'expo-notifications';

export async function registerForPush() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  return await Notifications.getExpoPushTokenAsync();
}

export async function scheduleBursaryReminder(title: string, deadline: string) {
  const date = new Date(deadline);
  date.setDate(date.getDate() - 3); // remind 3 days before
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bursary Deadline Soon',
      body: `${title} closes on ${deadline}. Submit your Pass now.`,
    },
    trigger: { date }
  });
}