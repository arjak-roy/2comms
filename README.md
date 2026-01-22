```
src/
├── controllers/
│   ├── authController.js
│   ├── attendanceController.js
│   ├── requestController.js
│   └── configController.js
├── repositories/
│   ├── userRepository.js
│   ├── attendanceRepository.js
│   ├── requestRepository.js
│   └── clientRepository.js
├── middleware/
│   ├── authMiddleware.js      # Verifies JWT
│   └── tenantMiddleware.js    # Extracts & verifies client_id
├── routes/
│   ├── authRoutes.js
│   ├── attendanceRoutes.js
│   └── requestRoutes.js
└── services/                  # Optional: Place complex logic (like GPS distance math) here
```