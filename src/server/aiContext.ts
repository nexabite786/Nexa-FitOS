import { getFirestore } from 'firebase-admin/firestore';

export async function buildClientAIContext(tenantId: string, clientId: string, db: FirebaseFirestore.Firestore): Promise<string> {
  try {
    let context = `Context for Client ID: ${clientId}\n`;

    // 1. Get Client Profile
    const clientDoc = await db.collection('tenants').doc(tenantId).collection('users').doc(clientId).get();
    if (clientDoc.exists) {
      const clientData = clientDoc.data()!;
      context += `\n--- CLIENT PROFILE ---\n`;
      context += `Name: ${clientData.firstName || 'Client'} ${clientData.lastName || ''}\n`;
      context += `Goals: ${clientData.goals ? clientData.goals.join(', ') : 'Not specified'}\n`;
      context += `Experience Level: ${clientData.experienceLevel || 'Not specified'}\n`;
      context += `Status: ${clientData.status || 'Active'}\n`;
    }

    // 2. Get Recent Workouts (last 5)
    const workoutsSnapshot = await db.collection('tenants').doc(tenantId)
      .collection('workoutSessions')
      .where('clientId', '==', clientId)
      .where('status', '==', 'COMPLETED')
      .orderBy('completedAt', 'desc')
      .limit(5)
      .get();
      
    context += `\n--- RECENT WORKOUTS (Last 5 completed) ---\n`;
    if (!workoutsSnapshot.empty) {
      workoutsSnapshot.docs.forEach(doc => {
        const w = doc.data();
        context += `- ${w.name || 'Workout'} completed on ${w.completedAt ? new Date(w.completedAt).toLocaleDateString() : 'Unknown date'}. Duration: ${w.durationMinutes || 0} mins. Volume: ${w.totalVolume || 0} lbs/kg.\n`;
      });
    } else {
      context += `No completed workouts recently.\n`;
    }

    // 3. Get Recent Progress (Weight)
    const metricsSnapshot = await db.collection('tenants').doc(tenantId)
      .collection('users').doc(clientId).collection('metrics')
      .orderBy('date', 'desc')
      .limit(3)
      .get();

    context += `\n--- RECENT BODY METRICS ---\n`;
    if (!metricsSnapshot.empty) {
      metricsSnapshot.docs.forEach(doc => {
        const m = doc.data();
        context += `- ${m.date}: Weight ${m.weight || 'N/A'}, Body Fat ${m.bodyFatPercentage || 'N/A'}%\n`;
      });
    } else {
      context += `No recent metrics logged.\n`;
    }

    // 4. Recent Check-ins
    const checkinsSnapshot = await db.collection('tenants').doc(tenantId)
      .collection('checkIns')
      .where('clientId', '==', clientId)
      .where('status', '==', 'REVIEWED')
      .orderBy('submittedAt', 'desc')
      .limit(2)
      .get();

    context += `\n--- RECENT CHECK-INS ---\n`;
    if (!checkinsSnapshot.empty) {
      checkinsSnapshot.docs.forEach(doc => {
        const c = doc.data();
        context += `- Date: ${c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : 'Unknown'}. Summary: Coach rated progress.\n`;
      });
    } else {
      context += `No recent reviewed check-ins.\n`;
    }

    // 5. Habits
    const habitsSnapshot = await db.collection('tenants').doc(tenantId)
      .collection('users').doc(clientId).collection('habits')
      .limit(5)
      .get();
      
    context += `\n--- ACTIVE HABITS ---\n`;
    if (!habitsSnapshot.empty) {
      habitsSnapshot.docs.forEach(doc => {
        const h = doc.data();
        context += `- ${h.title}: ${h.frequency} frequency.\n`;
      });
    } else {
      context += `No active habits tracked.\n`;
    }

    // 6. Upcoming Calendar Events (Next 7 days)
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const calendarSnapshot = await db.collection('tenants').doc(tenantId)
      .collection('calendarEvents')
      .where('clientId', '==', clientId)
      .where('date', '>=', today)
      .where('date', '<=', nextWeek)
      .orderBy('date', 'asc')
      .get();

    context += `\n--- UPCOMING SCHEDULE (Next 7 days) ---\n`;
    if (!calendarSnapshot.empty) {
      calendarSnapshot.docs.forEach(doc => {
        const ev = doc.data();
        context += `- ${ev.date}: ${ev.title} (${ev.type})\n`;
      });
    } else {
      context += `No scheduled workouts or events in the next 7 days.\n`;
    }

    return context;
  } catch (error) {
    console.error('Error building context:', error);
    return 'Context could not be loaded due to an error.';
  }
}
