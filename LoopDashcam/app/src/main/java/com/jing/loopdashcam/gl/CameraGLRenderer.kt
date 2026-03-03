package com.jing.loopdashcam.gl

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.SurfaceTexture
import android.graphics.Typeface
import android.opengl.EGL14
import android.opengl.EGLExt
import android.opengl.GLES11Ext
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.GLUtils
import android.opengl.Matrix
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

    @Volatile var recordingSurface: Surface? = null
    @Volatile var recordingWidth: Int = 1920
    @Volatile var recordingHeight: Int = 1080
    @Volatile var isRecording: Boolean = false
    @Volatile var currentSpeed: Float = -1f
    @Volatile var showSpeed: Boolean = true
    @Volatile var displayRotationDegrees: Int = 0

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 45f
        typeface = Typeface.MONOSPACE
        setShadowLayer(4f, 2f, 2f, Color.parseColor("#CC000000"))
    }

    private var overlayBitmap = Bitmap.createBitmap(1920, 1080, Bitmap.Config.ARGB_8888)
    private var overlayCanvas = Canvas(overlayBitmap)

    private val vertexShaderCode = """
        attribute vec4 position;
        attribute vec2 texcoord;
        varying vec2 v_texcoord;
        uniform mat4 uSTMatrix;
        uniform mat4 uMVPMatrix;
        void main() {
            gl_Position = uMVPMatrix * position;
            v_texcoord = (uSTMatrix * vec4(texcoord, 0.0, 1.0)).xy;
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

    private val vertexCoords = floatArrayOf(-1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f)
    private val textureCoords = floatArrayOf(0f, 0f, 1f, 0f, 0f, 1f, 1f, 1f)
    private val textureCoords2D = floatArrayOf(0f, 1f, 1f, 1f, 0f, 0f, 1f, 0f)

    private lateinit var vertexBuffer: FloatBuffer
    private lateinit var textureBufferOES: FloatBuffer
    private lateinit var textureBuffer2D: FloatBuffer
    private var programOES = 0
    private var program2D = 0
    private val stMatrix = FloatArray(16)
    private val mvpMatrix = FloatArray(16)
    private val identityMatrix = FloatArray(16).apply { Matrix.setIdentityM(this, 0) }

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES20.glClearColor(0f, 0f, 0f, 1f)
        vertexBuffer = ByteBuffer.allocateDirect(8 * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply { put(vertexCoords); position(0) }
        textureBufferOES = ByteBuffer.allocateDirect(8 * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply { put(textureCoords); position(0) }
        textureBuffer2D = ByteBuffer.allocateDirect(8 * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply { put(textureCoords2D); position(0) }
        programOES = createProgram(vertexShaderCode, fragmentShaderCodeOES)
        program2D = createProgram(vertexShaderCode, fragmentShaderCode2D)
        val tex = IntArray(2); GLES20.glGenTextures(2, tex, 0)
        oesTextureId = tex[0]; overlayTextureId = tex[1]
        setupTex(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, oesTextureId)
        setupTex(GLES20.GL_TEXTURE_2D, overlayTextureId)
        surfaceTexture = SurfaceTexture(oesTextureId)
        onSurfaceCreated(surfaceTexture!!)
    }

    private fun createProgram(v: String, f: String) = GLES20.glCreateProgram().apply {
        GLES20.glAttachShader(this, loadShader(GLES20.GL_VERTEX_SHADER, v))
        GLES20.glAttachShader(this, loadShader(GLES20.GL_FRAGMENT_SHADER, f))
        GLES20.glLinkProgram(this)
    }

    private fun loadShader(t: Int, s: String) = GLES20.glCreateShader(t).apply { GLES20.glShaderSource(this, s); GLES20.glCompileShader(this) }
    private fun setupTex(t: Int, i: Int) {
        GLES20.glBindTexture(t, i)
        GLES20.glTexParameteri(t, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(t, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(t, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
        GLES20.glTexParameteri(t, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
    }

    private var sW = 0; private var sH = 0
    override fun onSurfaceChanged(gl: GL10?, w: Int, h: Int) { sW = w; sH = h }

    private var encSurf = EGL14.EGL_NO_SURFACE
    private var eglDisp = EGL14.EGL_NO_DISPLAY
    private var eglCtx = EGL14.EGL_NO_CONTEXT

    override fun onDrawFrame(gl: GL10?) {
        val st = surfaceTexture ?: return
        st.updateTexImage()
        // The stMatrix already contains the correct rotation from the Camera Sensor.
        st.getTransformMatrix(stMatrix)
        if (eglDisp == EGL14.EGL_NO_DISPLAY) { eglDisp = EGL14.eglGetCurrentDisplay(); eglCtx = EGL14.eglGetCurrentContext() }
        updateOverlayTexture()

        // 1. Preview
        GLES20.glViewport(0, 0, sW, sH)
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
        // Center Crop without redundant rotation (rotation is handled by STMatrix)
        calculateSimpleCrop(sW, sH, 1920, 1080, mvpMatrix)
        drawFull(mvpMatrix, stMatrix)

        // 2. Record
        val rs = recordingSurface
        if (rs != null) {
            val d = EGL14.eglGetCurrentSurface(EGL14.EGL_DRAW)
            val r = EGL14.eglGetCurrentSurface(EGL14.EGL_READ)
            if (encSurf == EGL14.EGL_NO_SURFACE) encSurf = EGL14.eglCreateWindowSurface(eglDisp, getConf(), rs, intArrayOf(EGL14.EGL_NONE), 0)
            EGL14.eglMakeCurrent(eglDisp, encSurf, encSurf, eglCtx)
            GLES20.glViewport(0, 0, recordingWidth, recordingHeight)
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
            // No Crop for standard 16:9 recording
            drawFull(identityMatrix, stMatrix)
            EGLExt.eglPresentationTimeANDROID(eglDisp, encSurf, st.timestamp)
            EGL14.eglSwapBuffers(eglDisp, encSurf)
            EGL14.eglMakeCurrent(eglDisp, d, r, eglCtx)
        } else if (encSurf != EGL14.EGL_NO_SURFACE) {
            EGL14.eglDestroySurface(eglDisp, encSurf); encSurf = EGL14.EGL_NO_SURFACE
        }
    }

    private fun calculateSimpleCrop(vW: Int, vH: Int, iW: Int, iH: Int, matrix: FloatArray) {
        Matrix.setIdentityM(matrix, 0)
        // Check if display is currently portrait based on dimensions
        val isDisplayPortrait = vH > vW
        
        // Sensor is typically 1920x1080 (Landscape). 
        // If display is portrait, we are effectively mapping Landscape input to Portrait view.
        val targetAspect = if (isDisplayPortrait) iH.toFloat() / iW else iW.toFloat() / iH
        val viewAspect = vW.toFloat() / vH
        
        val sX: Float
        val sY: Float
        if (viewAspect > targetAspect) {
            sX = 1.0f
            sY = viewAspect / targetAspect
        } else {
            sX = targetAspect / viewAspect
            sY = 1.0f
        }
        Matrix.scaleM(matrix, 0, sX, sY, 1.0f)
    }

    private fun drawFull(mvp: FloatArray, st: FloatArray) {
        GLES20.glEnable(GLES20.GL_BLEND); GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE_MINUS_SRC_ALPHA)
        drawTex(programOES, GLES11Ext.GL_TEXTURE_EXTERNAL_OES, oesTextureId, mvp, st, textureBufferOES)
        drawTex(program2D, GLES20.GL_TEXTURE_2D, overlayTextureId, identityMatrix, identityMatrix, textureBuffer2D)
    }

    private fun drawTex(p: Int, t: Int, id: Int, mvp: FloatArray, st: FloatArray, tb: FloatBuffer) {
        GLES20.glUseProgram(p)
        val ph = GLES20.glGetAttribLocation(p, "position"); GLES20.glEnableVertexAttribArray(ph); GLES20.glVertexAttribPointer(ph, 2, GLES20.GL_FLOAT, false, 8, vertexBuffer)
        val th = GLES20.glGetAttribLocation(p, "texcoord"); GLES20.glEnableVertexAttribArray(th); GLES20.glVertexAttribPointer(th, 2, GLES20.GL_FLOAT, false, 8, tb)
        GLES20.glUniformMatrix4fv(GLES20.glGetUniformLocation(p, "uMVPMatrix"), 1, false, mvp, 0)
        GLES20.glUniformMatrix4fv(GLES20.glGetUniformLocation(p, "uSTMatrix"), 1, false, st, 0)
        GLES20.glActiveTexture(GLES20.GL_TEXTURE0); GLES20.glBindTexture(t, id)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
    }

    private fun updateOverlayTexture() {
        overlayBitmap.eraseColor(Color.TRANSPARENT)
        val timeStr = android.text.format.DateFormat.format("yyyy-MM-dd HH:mm:ss", System.currentTimeMillis()).toString()
        val margin = 80f
        if (showSpeed) overlayCanvas.drawText(if (currentSpeed >= 0) "${currentSpeed.toInt()} KM/H" else "0 KM/H", margin, 1080f - margin - 65f, textPaint)
        overlayCanvas.drawText(timeStr, margin, 1080f - margin, textPaint)
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, overlayTextureId); GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, overlayBitmap, 0)
    }

    private fun getConf(): android.opengl.EGLConfig? {
        val a = intArrayOf(EGL14.EGL_RED_SIZE, 8, EGL14.EGL_GREEN_SIZE, 8, EGL14.EGL_BLUE_SIZE, 8, EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT, 0x3142, 1, EGL14.EGL_NONE)
        val c = arrayOfNulls<android.opengl.EGLConfig>(1); val n = IntArray(1); EGL14.eglChooseConfig(eglDisp, a, 0, c, 0, 1, n, 0); return c[0]
    }
}
