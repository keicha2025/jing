/**
 * Google Apps Script Backend for Travel Planner
 * 
 * Entry Points:
 * - doGet(e): Read operations
 * - doPost(e): Write operations
 */

function doGet(e) {
    const params = e.parameter;
    const action = params.action;

    try {
        if (action === "test") {
            return responseJSON({ status: "ok", message: "GAS Backend is working" });
        }

        if (action === "login") {
            return Auth.login(params.username, params.password);
        }

        if (action === "getTrip") {
            return Handlers.getTrip(params.trip_id);
        }

        if (action === "getAllTrips") {
            return Handlers.getAllTrips(params.user_id);
        }

        return responseJSON({ error: "Unknown action" });

    } catch (err) {
        return responseJSON({ error: err.toString(), stack: err.stack });
    }
}

function doPost(e) {
    try {
        // Handle JSON payload
        let data;
        if (e.postData && e.postData.contents) {
            data = JSON.parse(e.postData.contents);
        } else {
            data = e.parameter; // Fallback
        }

        const action = data.action;

        if (action === "login") {
            return Auth.login(data.username, data.password);
        }

        if (action === "register") {
            return Auth.register(data.username, data.password, data.display_name);
        }

        if (action === "createTrip") {
            return Handlers.createTrip(data);
        }

        if (action === "cloneTrip") {
            return Handlers.cloneTrip(data.trip_id, data.user_id, data.new_title);
        }

        if (action === "addSpot") {
            return Handlers.addSpot(data);
        }

        if (action === "updateSpot") {
            return Handlers.updateSpot(data);
        }

        if (action === "deleteSpot") {
            return Handlers.deleteSpot(data.spot_id);
        }

        if (action === "updateTripDate") {
            return Handlers.updateTripDate(data.trip_id, data.start_date, data.end_date);
        }

        // --- Fix Features ---
        if (action === "updateFlight") {
            return Handlers.updateFlight(data);
        }

        if (action === "reorderSpot") {
            return Handlers.reorderSpot(data.spot_id, data.direction);
        }

        if (action === "updateDaySpots") {
            return Handlers.updateDaySpots(data);
        }

        // Migration Import
        if (action === "importData") {
            return Handlers.importData(data.payload);
        }

        return responseJSON({ error: "Unknown action: " + action });

    } catch (err) {
        return responseJSON({ error: err.toString() });
    }
}

function responseJSON(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

// --- Handlers Namespace ---
const Handlers = {
    getTrip: function (tripId) {
        const db = SheetDB.load();

        const trip = db.trips.find(t => t.trip_id === tripId);
        if (!trip) throw new Error("Trip not found");

        const owner = db.users.find(u => u.user_id === trip.owner_id);
        trip.owner_name = owner ? owner.display_name : "Unknown";

        const days = db.days.filter(d => d.trip_id === tripId).sort((a, b) => a.day_order - b.day_order);

        const dayIds = days.map(d => d.day_id);
        const allSpots = db.spots.filter(s => dayIds.includes(s.day_id)).sort((a, b) => a.spot_order - b.spot_order);

        days.forEach(day => {
            day.spots = allSpots.filter(s => s.day_id === day.day_id);
        });

        trip.days = days;
        trip.accommodations = db.accommodations.filter(a => a.trip_id === tripId);
        trip.flights = db.flights.filter(f => f.trip_id === tripId);

        return responseJSON(trip);
    },

    getAllTrips: function (userId) {
        const db = SheetDB.load();
        const user = db.users.find(u => u.user_id === userId);
        if (!user) throw new Error("User not found");

        if (user.role === 'admin') {
            return responseJSON({ trips: db.trips });
        } else {
            const myTrips = db.trips.filter(t => t.owner_id === userId);
            return responseJSON({ trips: myTrips });
        }
    },

    createTrip: function (data) {
        return responseJSON({ status: "not_implemented_yet" });
    },

    cloneTrip: function (tripId, userId, newTitle) {
        const db = SheetDB.load();
        const originalTrip = db.trips.find(t => t.trip_id === tripId);
        if (!originalTrip) throw new Error("Original trip not found");

        const newTripId = Utilities.getUuid();
        const newTrip = { ...originalTrip, trip_id: newTripId, owner_id: userId, title: newTitle || ("Copy of " + originalTrip.title), created_at: new Date().toISOString(), is_template: false };
        SheetDB.insert('Trips', newTrip);

        const days = db.days.filter(d => d.trip_id === tripId);
        const dayIdMap = {};

        days.forEach(day => {
            const newDayId = Utilities.getUuid();
            dayIdMap[day.day_id] = newDayId;
            const newDay = { ...day, day_id: newDayId, trip_id: newTripId };
            SheetDB.insert('Days', newDay);
        });

        const spots = db.spots.filter(s => dayIdMap[s.day_id]);
        spots.forEach(spot => {
            const newSpot = { ...spot, spot_id: Utilities.getUuid(), day_id: dayIdMap[spot.day_id] };
            SheetDB.insert('Spots', newSpot);
        });

        db.accommodations.filter(a => a.trip_id === tripId).forEach(a => {
            const newA = { ...a, id: Utilities.getUuid(), trip_id: newTripId };
            SheetDB.insert('Accommodations', newA);
        });

        db.flights.filter(f => f.trip_id === tripId).forEach(f => {
            const newF = { ...f, id: Utilities.getUuid(), trip_id: newTripId };
            SheetDB.insert('Flights', newF);
        });

        return responseJSON({ status: "success", trip_id: newTripId });
    },

    addSpot: function (data) {
        const spot = {
            spot_id: Utilities.getUuid(),
            day_id: data.day_id,
            spot_order: data.spot_order || 99,
            time: data.time || "",
            type: data.type || "spot",
            title: data.title,
            note: data.note || "",
            map_link: data.map_link || "",
            created_at: new Date().toISOString()
        };
        SheetDB.insert('Spots', spot);
        return responseJSON(spot);
    },

    updateSpot: function (data) {
        const updated = SheetDB.update('Spots', 'spot_id', data.spot_id, data);
        return responseJSON(updated);
    },

    deleteSpot: function (spotId) {
        SheetDB.deleteRow('Spots', 'spot_id', spotId);
        return responseJSON({ status: "deleted" });
    },

    updateTripDate: function (tripId, startDate, endDate) {
        SheetDB.update('Trips', 'trip_id', tripId, { start_date: startDate, end_date: endDate });
        return responseJSON({ status: "updated" });
    },

    // --- New Handlers ---
    updateFlight: function (data) {
        const updated = SheetDB.update('Flights', 'id', data.id, data);
        return responseJSON(updated);
    },

    reorderSpot: function (spotId, direction) {
        const db = SheetDB.load();
        const spot = db.spots.find(s => s.spot_id === spotId);
        if (!spot) throw new Error("Spot not found");

        // Find spots in same day
        const daySpots = db.spots.filter(s => s.day_id === spot.day_id).sort((a, b) => a.spot_order - b.spot_order);
        const index = daySpots.findIndex(s => s.spot_id === spotId);

        let swapSpot = null;
        if (direction === 'up' && index > 0) {
            swapSpot = daySpots[index - 1];
        } else if (direction === 'down' && index < daySpots.length - 1) {
            swapSpot = daySpots[index + 1];
        }

        if (swapSpot) {
            // Swap orders values logic
            // To be robust, we swap the order values. 
            // If orders are identical, this logic fails to sort. 
            // Ideally re-normalize 1..N.
            // Simplified swap:
            const tempOrder = spot.spot_order;
            spot.spot_order = swapSpot.spot_order;
            swapSpot.spot_order = tempOrder;

            // Persist
            SheetDB.update('Spots', 'spot_id', spot.spot_id, { spot_order: spot.spot_order });
            SheetDB.update('Spots', 'spot_id', swapSpot.spot_id, { spot_order: swapSpot.spot_order });

            return responseJSON({ status: "success", spots: [spot, swapSpot] });
        }
        return responseJSON({ status: "no_move" });
    },

    updateDaySpots: function (payload) {
        // payload: { day_id, spots: [...] }
        const spots = payload.spots;
        if (!spots || !Array.isArray(spots)) return responseJSON({ error: "Invalid spots data" });

        // Batch update is ideal, but here we loop
        spots.forEach((s, idx) => {
            // Ensure order is correct relative to the array sent
            // We only update fields that might change in list edit: order, time, note
            const updateData = {
                spot_order: idx + 1,
                time: s.time,
                note: s.note,
                title: s.title
                // type? 
            };
            SheetDB.update('Spots', 'spot_id', s.spot_id, updateData);
        });
        return responseJSON({ status: "success", count: spots.length });
    },

    importData: function (payload) {
        if (payload.users) payload.users.forEach(u => SheetDB.insert('Users', u));
        if (payload.trips) payload.trips.forEach(t => SheetDB.insert('Trips', t));
        if (payload.days) payload.days.forEach(d => SheetDB.insert('Days', d));
        if (payload.spots) payload.spots.forEach(s => SheetDB.insert('Spots', s));
        if (payload.accommodations) payload.accommodations.forEach(a => SheetDB.insert('Accommodations', a));
        if (payload.flights) payload.flights.forEach(f => SheetDB.insert('Flights', f));
        return responseJSON({ status: "imported", count: payload.trips ? payload.trips.length : 0 });
    }
};
