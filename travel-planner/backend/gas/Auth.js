/**
 * Auth.js
 */

const Auth = {
    login: function (username, password) {
        const db = SheetDB.load();
        const user = db.users.find(u => u.username === username);

        if (!user) {
            return responseJSON({ error: "User not found" });
        }

        // Simple password check (In prod, use simple hash at least)
        if (String(user.password) === String(password)) {
            return responseJSON({
                status: "success",
                user: {
                    user_id: user.user_id,
                    username: user.username,
                    display_name: user.display_name,
                    role: user.role
                }
            });
        } else {
            return responseJSON({ error: "Invalid password" });
        }
    },

    register: function (username, password, displayName) {
        const db = SheetDB.load();
        if (db.users.find(u => u.username === username)) {
            return responseJSON({ error: "Username taken" });
        }

        const newUser = {
            user_id: Utilities.getUuid(),
            username: username,
            password: password, // Raw for now as requested
            display_name: displayName || username,
            role: "user",
            created_at: new Date().toISOString()
        };

        SheetDB.insert('Users', newUser);
        return responseJSON({ status: "success", user_id: newUser.user_id });
    }
};
