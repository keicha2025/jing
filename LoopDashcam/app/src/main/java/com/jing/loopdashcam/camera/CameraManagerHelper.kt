package com.jing.loopdashcam.camera

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.SurfaceTexture
import android.hardware.camera2.CameraAccessException
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.util.Range
import android.view.Surface

/**
 * Encapsulates the Android Camera2 API to handle strict 60fps locking
 * and high-performance OES Texture routing.
 */
class CameraManagerHelper(private val context: Context) {

    private val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    private var cameraDevice: CameraDevice? = null
    private var captureSession: CameraCaptureSession? = null

    private val backgroundThread = HandlerThread("CameraBackground").apply { start() }
    private val backgroundHandler = Handler(backgroundThread.looper)

    private var currentCameraId: String? = null
    private var currentSurfaceTexture: SurfaceTexture? = null
    private var currentWidth: Int = 0
    private var currentHeight: Int = 0

    @SuppressLint("MissingPermission")
    fun openCamera(surfaceTexture: SurfaceTexture, width: Int, height: Int, lensFacing: Int = CameraCharacteristics.LENS_FACING_BACK) {
        currentSurfaceTexture = surfaceTexture
        currentWidth = width
        currentHeight = height
        
        try {
            val cameraId = getCameraIdByLens(lensFacing) ?: return
            currentCameraId = cameraId
            
            surfaceTexture.setDefaultBufferSize(width, height)
            val surface = Surface(surfaceTexture)

            cameraManager.openCamera(cameraId, object : CameraDevice.StateCallback() {
                override fun onOpened(camera: CameraDevice) {
                    cameraDevice = camera
                    startPreview(surface)
                }

                override fun onDisconnected(camera: CameraDevice) {
                    camera.close()
                    cameraDevice = null
                }

                override fun onError(camera: CameraDevice, error: Int) {
                    camera.close()
                    cameraDevice = null
                    Log.e("CameraManager", "Camera error: $error")
                }
            }, backgroundHandler)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startPreview(surface: Surface) {
        val device = cameraDevice ?: return
        try {
            val builder = device.createCaptureRequest(CameraDevice.TEMPLATE_RECORD)
            builder.addTarget(surface)

            // Force 60FPS lock for smooth video 
            // In a real device you MUST query supported ranges first to ensure 60fps is available
            val fpsRange = Range(60, 60)
            builder.set(android.hardware.camera2.CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, fpsRange)
            // Disable video stabilization to prevent conflict with 60fps 
            builder.set(android.hardware.camera2.CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE, 0)
            
            device.createCaptureSession(listOf(surface), object : CameraCaptureSession.StateCallback() {
                override fun onConfigured(session: CameraCaptureSession) {
                    captureSession = session
                    session.setRepeatingRequest(builder.build(), null, backgroundHandler)
                }

                override fun onConfigureFailed(session: CameraCaptureSession) {
                    Log.e("CameraManager", "Configure Failed")
                }
            }, backgroundHandler)
        } catch (e: CameraAccessException) {
            e.printStackTrace()
        }
    }

    fun switchCamera() {
        cameraDevice?.close()
        cameraDevice = null
        
        // Simple toggle: if BACK, switch to FRONT. If FRONT, switch to BACK.
        val characteristics = cameraManager.getCameraCharacteristics(currentCameraId ?: return)
        val currentLens = characteristics.get(CameraCharacteristics.LENS_FACING)
        val nextLens = if (currentLens == CameraCharacteristics.LENS_FACING_BACK) 
                         CameraCharacteristics.LENS_FACING_FRONT else CameraCharacteristics.LENS_FACING_BACK
        
        openCamera(currentSurfaceTexture!!, currentWidth, currentHeight, nextLens)
    }

    private fun getCameraIdByLens(lensFacing: Int): String? {
        for (cameraId in cameraManager.cameraIdList) {
            val characteristics = cameraManager.getCameraCharacteristics(cameraId)
            if (characteristics.get(CameraCharacteristics.LENS_FACING) == lensFacing) {
                return cameraId
            }
        }
        return null
    }

    fun closeCamera() {
        captureSession?.close()
        cameraDevice?.close()
        backgroundThread.quitSafely()
    }
}
