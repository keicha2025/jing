package com.jing.loopdashcam

import android.annotation.SuppressLint
import android.content.Context
import android.os.Looper
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

class GPSManager(context: Context, private val onSpeedUpdate: (Float) -> Unit) {

    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    
    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(locationResult: LocationResult) {
            for (location in locationResult.locations) {
                if (location.hasSpeed()) {
                    // Convert speed from m/s to km/h
                    val speedKmH = location.speed * 3.6f
                    onSpeedUpdate(speedKmH)
                } else {
                    // -1 means no valid speed signal currently
                    onSpeedUpdate(-1f)
                }
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun start() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000)
            .setMinUpdateIntervalMillis(500)
            .build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
    }

    fun stop() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }
}
