{/* class for handling local calendar functions */}

import * as Calendar from 'expo-calendar';
import { getCalendars } from 'expo-localization';

// add task event to local calender
export async function addCalEvent(text, datetime) {
  const defaultCalendar = await Calendar.getDefaultCalendarAsync(); // get device default calendar
  const { timeZone } = getCalendars()[0]; // get device calendar's timezone

  // create event object
  const eventDetails = {
    title: text,
    startDate: datetime,
    endDate: datetime,
    timeZone: timeZone,
    allDay: false,
  };
  return (await Calendar.createEventAsync(defaultCalendar.id, eventDetails));
}

// delete task event from local calender
export async function deleteCalEvent(taskID) {
  await Calendar.deleteEventAsync(taskID);
}