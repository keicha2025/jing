package com.jing.loopdashcam.gl

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.SurfaceTexture
import android.graphics.Typeface
import android.opengl.*
import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.EGLContext
import android.opengl.EGLDisplay
import android.opengl.EGLSurface
import android.view.Surface
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

class CameraGLRenderer(
    private val context: Context,
    private val onSurfaceCreated: (SurfaceTexture) -> Unit
) : GLSurfaceView.Renderer {

    private var oesTextureId = 0
    private var overlayTextureId = 0
    private var surfaceTexture: SurfaceTexture? = null

    // For Recording
    @Volatile var recordingSurface: Surface? = null
    private var encoderTextureReady = false

    @Volatile var currentSpeed: Float = -1f
    @Volatile var showSpeed: Boolean = true

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 60f
        typeface = Typeface.MONOSPACE
        setShadowLayer(4f, 0f, 0f, Color.parseColor("#99000000"))
    }
    
    private val overlayBitmap = Bitmap.createBitmap(1920, 1080, Bitmap.Config.ARGB_8888)
    private val overlayCanvas = Canvas(overlayBitmap)

    private val vertexShaderCode = """
        attribute vec4 position;
        attribute vec2 texcoord;
        varying vec2 v_texcoord;
        void main() {
            gl_Position = position;
            v_texcoord = texcoord;
        }
    """.trimIndent()

    private val fragmentShaderCodeOES = """
        #extension GL_OES_EGL_image_external : require
        precision mediump float;
        uniform samplerExternalOES tex_sampler;
        varying vec2 v_texcoord;
        void main() {
            gl_FragColor = texture2D(tex_sampler, v_texcoord);
        }
    """.trimIndent()

    private val fragmentShaderCode2D = """
        precision mediump float;
        uniform sampler2D tex_sampler;
        varying vec2 v_texcoord;
        void main() {
            gl_FragColor = texture2D(tex_sampler, v_texcoord);
        }
    """.trimIndent()

    private val vertexCoords = floatArrayOf(
        -1.0f, -1.0f, // bottom left
         1.0f, -1.0f, // bottom right
        -1.0f,  1.0f, // top left
         1.0f,  1.0f  // top right
    )
    
    // Adjusted Texture coordinates to fix upside-down text overlay
    // OpenGL expects (0,1) at top but Bitmap puts (0,0) at top.
    private val textureCoords = floatArrayOf(
        0.0f, 1.0f,
        1.0f, 1.0f,
        0.0f, 0.0f,
        1.0f, 0.0f
    )

    private lateinit var vertexBuffer: FloatBuffer
    private lateinit var textureBuffer: FloatBuffer
    
    private var programOES = 0
    private var program2D = 0

    private fun loadShader(type: Int, shaderCode: String): Int {
        val shader = GLES20.glCreateShader(type)
        GLES20.glShaderSource(shader, shaderCode)
        GLES20.glCompileShader(shader)
        return shader
    }

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES20.glClearColor(0f, 0f, 0f, 1f)

        val bb = ByteBuffer.allocateDirect(vertexCoords.size * 4)
        bb.order(ByteOrder.nativeOrder())
        vertexBuffer = bb.asFloatBuffer().apply { put(vertexCoords); position(0) }

        val tb = ByteBuffer.allocateDirect(textureCoords.size * 4)
        tb.order(ByteOrder.nativeOrder())
        textureBuffer = tb.asFloatBuffer().apply { put(textureCoords); position(0) }

        val vertexShader = loadShader(GLES20.GL_VERTEX_SHADER, vertexShaderCode)
        val fragmentShaderOES = loadShader(GLES20.GL_FRAGMENT_SHADER, fragmentShaderCodeOES)
        programOES = GLES20.glCreateProgram()
        GLES20.glAttachShader(programOES, vertexShader)
        GLES20.glAttachShader(programOES, fragmentShaderOES)
        GLES20.glLinkProgram(programOES)

        val fragmentShader2D = loadShader(GLES20.GL_FRAGMENT_SHADER, fragmentShaderCode2D)
        program2D = GLES20.glCreateProgram()
        GLES20.glAttachShader(program2D, vertexShader)
        GLES20.glAttachShader(program2D, fragmentShader2D)
        GLES20.glLinkProgram(program2D)

        val textures = IntArray(2)
        GLES20.glGenTextures(2, textures, 0)
        oesTextureId = textures[0]
        overlayTextureId = textures[1]

        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, oesTextureId)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)

        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, overlayTextureId)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)

        GLES20.glEnable(GLES20.GL_BLEND)
        GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE_MINUS_SRC_ALPHA)

        surfaceTexture = SurfaceTexture(oesTextureId)
        onSurfaceCreated(surfaceTexture!!)
    }

    private var screenWidth = 0
    private var screenHeight = 0

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        screenWidth = width
        screenHeight = height
        GLES20.glViewport(0, 0, width, height)
    }

    private var encoderEglSurface = EGL14.EGL_NO_SURFACE
    private var screenEglSurface = EGL14.EGL_NO_SURFACE
    private var eglDisplay = EGL14.EGL_NO_DISPLAY
    private var eglContext = EGL14.EGL_NO_CONTEXT
    
    private val EGL_RECORDABLE_ANDROID = 0x3142

    override fun onDrawFrame(gl: GL10?) {
        surfaceTexture?.updateTexImage()

        // Capture current EGL state if we haven't yet
        if (eglDisplay == EGL14.EGL_NO_DISPLAY) {
            eglDisplay = EGL14.eglGetCurrentDisplay()
            eglContext = EGL14.eglGetCurrentContext()
        }

        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
        
        // Render 1: Default to GLSurfaceView (The Screen)
        drawFullFrame()
        
        // Render 2: Optionally to RecordingSurface (Encoder)
        val recordSurface = recordingSurface
        if (recordSurface != null) {
            if (encoderEglSurface == EGL14.EGL_NO_SURFACE) {
                // Create EGLSurface for the encoder
                val config = getEGLConfig()
                val surfaceAttribs = intArrayOf(EGL14.EGL_NONE)
                encoderEglSurface = EGL14.eglCreateWindowSurface(eglDisplay, config, recordSurface, surfaceAttribs, 0)
                screenEglSurface = EGL14.eglGetCurrentSurface(EGL14.EGL_DRAW)
            }

            // Switch to Encoder Surface
            EGL14.eglMakeCurrent(eglDisplay, encoderEglSurface, encoderEglSurface, eglContext)
            
            // Set output size for video (usually match preview or encoder config)
            GLES20.glViewport(0, 0, 1920, 1080)
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
            
            drawFullFrame()
            
            // Set presentation time for MediaCodec (nanoseconds)
            val nsecs = surfaceTexture?.timestamp ?: 0L
            EGLExt.eglPresentationTimeANDROID(eglDisplay, encoderEglSurface, nsecs)
            
            EGL14.eglSwapBuffers(eglDisplay, encoderEglSurface)

            // Restore Screen Surface
            EGL14.eglMakeCurrent(eglDisplay, screenEglSurface, screenEglSurface, eglContext)
            // Restore Viewport for screen
            GLES20.glViewport(0, 0, screenWidth, screenHeight)
        } else if (encoderEglSurface != EGL14.EGL_NO_SURFACE) {
            // Cleanup when recording stops
            EGL14.eglDestroySurface(eglDisplay, encoderEglSurface)
            encoderEglSurface = EGL14.EGL_NO_SURFACE
        }
    }

    private fun getEGLConfig(): android.opengl.EGLConfig? {
        val attribList = intArrayOf(
            EGL14.EGL_RED_SIZE, 8,
            EGL14.EGL_GREEN_SIZE, 8,
            EGL14.EGL_BLUE_SIZE, 8,
            EGL14.EGL_ALPHA_SIZE, 8,
            EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
            EGL_RECORDABLE_ANDROID, 1,
            EGL14.EGL_NONE
        )
        val configs = arrayOfNulls<android.opengl.EGLConfig>(1)
        val numConfigs = IntArray(1)
        EGL14.eglChooseConfig(eglDisplay, attribList, 0, configs, 0, configs.size, numConfigs, 0)
        return configs[0]
    }

    private fun drawFullFrame() {
        drawTextureQuad(programOES, GLES11Ext.GL_TEXTURE_EXTERNAL_OES, oesTextureId)
        updateOverlayTexture()
        drawTextureQuad(program2D, GLES20.GL_TEXTURE_2D, overlayTextureId)
    }

    private fun updateOverlayTexture() {
        overlayBitmap.eraseColor(Color.TRANSPARENT)
        val timeString = android.text.format.DateFormat.format("yyyy-MM-dd HH:mm:ss", System.currentTimeMillis()).toString()
        overlayCanvas.drawText(timeString, 80f, 1000f, textPaint)

        if (showSpeed) {
            val speedString = if (currentSpeed >= 0) "SPD: ${currentSpeed.toInt()} km/h" else "GPS LOST"
            overlayCanvas.drawText(speedString, 80f, 920f, textPaint)
        }

        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, overlayTextureId)
        GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, overlayBitmap, 0)
    }
    
    private fun drawTextureQuad(program: Int, target: Int, textureId: Int) {
        GLES20.glUseProgram(program)
        
        val positionHandle = GLES20.glGetAttribLocation(program, "position")
        GLES20.glEnableVertexAttribArray(positionHandle)
        GLES20.glVertexAttribPointer(positionHandle, 2, GLES20.GL_FLOAT, false, 8, vertexBuffer)

        val texcoordHandle = GLES20.glGetAttribLocation(program, "texcoord")
        GLES20.glEnableVertexAttribArray(texcoordHandle)
        GLES20.glVertexAttribPointer(texcoordHandle, 2, GLES20.GL_FLOAT, false, 8, textureBuffer)

        GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
        GLES20.glBindTexture(target, textureId)
        val samplerHandle = GLES20.glGetUniformLocation(program, "tex_sampler")
        GLES20.glUniform1i(samplerHandle, 0)

        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
        
        GLES20.glDisableVertexAttribArray(positionHandle)
        GLES20.glDisableVertexAttribArray(texcoordHandle)
    }
}
