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
    private var currentFps: Int = 60
    private var currentLensFacing: Int = CameraCharacteristics.LENS_FACING_BACK

    @SuppressLint("MissingPermission")
    fun openCamera(surfaceTexture: SurfaceTexture, width: Int, height: Int, fps: Int = 60, lensFacing: Int = CameraCharacteristics.LENS_FACING_BACK) {
        val cameraId = getCameraIdByLens(lensFacing)
        if (cameraId == null) {
            Log.e("CameraManager", "Could not find camera with specified lens facing: $lensFacing")
            return
        }

        currentCameraId = cameraId
        currentSurfaceTexture = surfaceTexture
        currentWidth = width
        currentHeight = height
        currentFps = fps
        currentLensFacing = lensFacing
        
        try {
            surfaceTexture.setDefaultBufferSize(width, height)
            val surface = Surface(surfaceTexture)

            cameraManager.openCamera(cameraId, object : CameraDevice.StateCallback() {
                override fun onOpened(camera: CameraDevice) {
                    cameraDevice = camera
                    startPreview(surface, cameraId)
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

    private fun startPreview(surface: Surface, cameraId: String) {
        val device = cameraDevice ?: return
        try {
            val builder = device.createCaptureRequest(CameraDevice.TEMPLATE_RECORD)
            builder.addTarget(surface)

            // Auto-fallback FPS Range
            val characteristics = cameraManager.getCameraCharacteristics(cameraId)
            val fpsRanges = characteristics.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES)
            
            var bestRange = fpsRanges?.firstOrNull() ?: Range(30, 30)
            if (fpsRanges != null) {
                for (range in fpsRanges) {
                    if (range.upper == currentFps && range.lower == currentFps) {
                        bestRange = range
                        break
                    } else if (range.upper >= currentFps) {
                        bestRange = range // nearest high
                    }
                }
            }
            
            builder.set(android.hardware.camera2.CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, bestRange)
            // Disable video stabilization to prevent conflict with 60fps 
            builder.set(android.hardware.camera2.CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE, 0)
            
            device.createCaptureSession(listOf(surface), object : CameraCaptureSession.StateCallback() {
                override fun onConfigured(session: CameraCaptureSession) {
                    captureSession = session
                    try {
                        session.setRepeatingRequest(builder.build(), null, backgroundHandler)
                    } catch (e: Exception) {
                        Log.e("CameraManager", "Ignored session config error (camera might be switching): ${e.message}")
                    }
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
        val nextLens = if (currentLensFacing == CameraCharacteristics.LENS_FACING_BACK)
                         CameraCharacteristics.LENS_FACING_FRONT else CameraCharacteristics.LENS_FACING_BACK
        
        val st = currentSurfaceTexture
        if (st == null) {
            Log.e("CameraManager", "SurfaceTexture is null, cannot switch camera")
            return
        }
        
        try {
            captureSession?.close()
            cameraDevice?.close()
            cameraDevice = null
            openCamera(st, currentWidth, currentHeight, currentFps, nextLens)
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun changeResolution(width: Int, height: Int, fps: Int) {
        if (currentWidth == width && currentHeight == height && currentFps == fps) return
        
        val st = currentSurfaceTexture
        if (st == null) {
            Log.e("CameraManager", "SurfaceTexture is null, cannot change resolution")
            return
        }
        
        try {
            captureSession?.close()
            cameraDevice?.close()
            cameraDevice = null
            openCamera(st, width, height, fps, currentLensFacing)
        } catch (e: Exception) { e.printStackTrace() }
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
