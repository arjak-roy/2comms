module.exports.calculateIntervals = (punches)=> {
        let totalMilliseconds = 0;

        // Sort punches by time to ensure chronological processing
        const sortedPunches = punches.sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));

        for (let i = 0; i < sortedPunches.length - 1; i++) {
            const current = sortedPunches[i];
            const next = sortedPunches[i + 1];

            // Only calculate if we have an IN followed by an OUT
            if (current.punch_type === 'IN' && next.punch_type === 'OUT') {
                const durationMs = new Date(next.punch_time) - new Date(current.punch_time);
                const durationMins = durationMs / (1000 * 60);

                // Enforce the 15-minute interval rule 
                if (durationMins >= 15) {
                    totalMilliseconds += durationMs;
                }
                
                // Skip the next punch as it was the 'OUT' for this 'IN'
                i++; 
            }
        }

        // Convert milliseconds to decimal hours (e.g., 8.5 for 8 hours 30 mins)
        const totalHours = totalMilliseconds / (1000 * 60 * 60);
        return parseFloat(totalHours.toFixed(2));
    }
// //test
// const punches = [
//   {
//     "id": 2,
//     "employee_id": 7,
//     "client_id": 1,
//     "punch_time": "2026-01-22 07:55:00",
//     "punch_type": "IN",
//   },
//   {
//     "id": 3,
//     "employee_id": 7,
//     "client_id": 1,
//     "punch_time": "2026-01-22 08:55:00",
//     "punch_type": "OUT",
//   },
//   {
//     "id": 4,
//     "employee_id": 7,
//     "client_id": 1,
//     "punch_time": "2026-01-22 09:55:00",
//     "punch_type": "IN",
//   },
//   {
//     "id": 5,
//     "employee_id": 7,
//     "client_id": 1,
//     "punch_time": "2026-01-22 10:55:00",
//     "punch_type": "OUT",
//   }
// ]

// console.log(calculateIntervals(punches));


