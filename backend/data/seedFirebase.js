const { ref, set } = require('firebase/database');
const { database } = require('../config/firebase');
const { store } = require('./mockData');

async function seed() {
  console.log('Seeding Firebase Realtime Database...');
  
  try {
    // Convert array to object map for optimal Firebase storage
    const shipmentsMap = {};
    store.shipments.forEach(s => { shipmentsMap[s.id] = s; });

    const alertsMap = {};
    store.alerts.forEach(a => { alertsMap[a.id] = a; });

    await set(ref(database, 'shipments'), shipmentsMap);
    await set(ref(database, 'alerts'), alertsMap);
    await set(ref(database, 'analytics'), store.analytics);

    console.log('✅ Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
