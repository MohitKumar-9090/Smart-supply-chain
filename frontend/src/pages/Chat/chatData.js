export const SUGGESTIONS = [
  'Which shipments are at risk right now?',
  'What is causing delays on the Hamburg route?',
  'Suggest the best route for TC-2024-002',
  'Will my Mumbai-Dubai shipment be delayed?',
  'What is the weather situation affecting deliveries?',
  'Show me the most efficient routes today',
];

export const formatMessage = (text) => {
  // Bold text between ** **
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');
};
