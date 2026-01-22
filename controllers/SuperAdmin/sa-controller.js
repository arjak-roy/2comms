const clientRepo = require('../../repositories/clientRepository');
const userRepo = require('../../repositories/userRepository');
const bcrypt = require('bcryptjs');
exports.addBranch = async (req, res) => {
    try {
        const { client_id } = req.user; // Extracted from Auth Middleware
        const branch = await clientRepo.createBranch(client_id, req.body);
        
        res.status(201).json({
            success: true,
            message: "Branch configured successfully",
            data: branch
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.registerNewClient = async (req, res) => {
    try {
        const { name, entity_id } = req.body;
        console.log(name, entity_id);

        // 1. Basic Validation
        if (!name || !entity_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Client id and clientId Number are required." 
            });
        }

        // 2. Check if Client already exists (Optional but recommended)
        // const existingClient = await clientRepo.findByName(name);
        
        // 3. Create the Client in Supabase
        const newClient = await clientRepo.createClient(name, entity_id);

        res.status(201).json({
            success: true,
            message: "New company onboarded successfully",
            data: newClient
        });
    } catch (error) {
        console.error("Client Creation Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to create client", 
            error: error.message 
        });
    }
};

exports.createUser = async (req, res) => {
    try {
        const  { name, email, password, role, clientId, branchId, managerId } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            name: name,
            email:email,
            hashedPassword: hashedPassword,
            role: role,
            client_id: clientId,
            branch_id: branchId,
            manager_id: managerId
        }
        const user = await userRepo.create(newUser);
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};