import { Router } from 'express';
import { db } from '../db';

export const authRouter = Router();

/**
 * POST /api/auth/student-register
 * Registers a student with Full Name, Mobile/WhatsApp & Email ID,
 * saves on Live Server & Firebase RTDB, and binds current device.
 */
authRouter.post('/student-register', async (req, res) => {
  try {
    const { fullName, email, mobile, deviceInfo } = req.body || {};

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'দয়া করে আপনার সম্পূর্ণ নাম লিখুন।',
      });
    }

    const cleanMobile = String(mobile || '').replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'দয়া করে একটি সঠিক ১০ সংখ্যার WhatsApp / মোবাইল নম্বর লিখুন।',
      });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'দয়া করে একটি সঠিক ইমেইল আইডি লিখুন।',
      });
    }

    await db.syncWithFirebaseStudents().catch(() => {});

    // Check if account already exists
    const existing =
      db.getStudentByEmailOrMobile(cleanMobile) ||
      db.getStudentByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_EXISTS',
        message:
          'এই মোবাইল নম্বর বা ইমেইল দিয়ে ইতিপূর্বেই অ্যাকাউন্ট খোলা হয়েছে। দয়া করে "Sign In" ট্যাবে গিয়ে লগইন করুন।',
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const student = db.upsertStudent({
      fullName: fullName.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      ip: clientIp,
    });

    if (deviceInfo?.token) {
      db.checkAndBindStudentDevice({
        userId: student.id,
        userEmail: student.email,
        studentName: student.fullName,
        deviceToken: deviceInfo.token,
        deviceDescription: deviceInfo.userAgent,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        ip: clientIp,
        allowDeviceTransfer: true,
      });
    }

    res.json({
      success: true,
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        mobile: student.mobile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/student-login
 * Logs in an existing student using ONLY Mobile Number or Email ID,
 * checking Live Server DB + Firebase RTDB + Orders, and supporting cross-device (Desktop/Mobile) login.
 */
authRouter.post('/student-login', async (req, res) => {
  try {
    const { identifier, deviceInfo } = req.body || {};
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        error: 'দয়া করে আপনার রেজিস্টার্ড মোবাইল নম্বর বা ইমেইল আইডি লিখুন।',
      });
    }

    const cleanIdentifier = identifier.trim();
    const cleanLower = cleanIdentifier.toLowerCase();
    const cleanDigits = cleanIdentifier.replace(/\D/g, '');

    let student = db.getStudentByEmailOrMobile(cleanIdentifier);

    if (!student) {
      await Promise.all([
        db.syncWithFirebaseStudents().catch(() => {}),
        db.syncWithFirebaseOrders().catch(() => {}),
      ]);
      student = db.getStudentByEmailOrMobile(cleanIdentifier);
    }

    // If student ordered directly at Checkout (order exists in DB/Firebase) without explicit Register click
    if (!student) {
      const matchedOrder = db.getOrders().find((o) => {
        const oEmail = (o.studentEmail || '').trim().toLowerCase();
        const oMobile = (o.studentMobile || '').replace(/\D/g, '');
        return (
          (cleanLower.includes('@') && oEmail === cleanLower) ||
          (cleanDigits.length >= 10 && oMobile === cleanDigits)
        );
      });
      if (matchedOrder) {
        student = db.upsertStudent({
          fullName: matchedOrder.studentName || 'BCA Student',
          email:
            matchedOrder.studentEmail ||
            `${matchedOrder.studentMobile || cleanDigits}@student.bcastudypoint.com`,
          mobile: matchedOrder.studentMobile || cleanDigits,
        });
      }
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'NOT_REGISTERED',
        message:
          'এই মোবাইল নম্বর বা ইমেইল আইডিতে কোনো অ্যাকাউন্ট পাওয়া যায়নি। দয়া করে "Register" ট্যাবে গিয়ে নাম, মোবাইল ও ইমেইল দিয়ে রেজিস্ট্রেশন করুন।',
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    // Allow logging in from any Desktop / Mobile device by cleanly transferring active device binding
    if (deviceInfo?.token) {
      db.checkAndBindStudentDevice({
        userId: student.id,
        userEmail: student.email,
        studentName: student.fullName,
        deviceToken: deviceInfo.token,
        deviceDescription: deviceInfo.userAgent,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        ip: clientIp,
        allowDeviceTransfer: true,
      });
    }

    student.lastLoginAt = new Date().toISOString();
    student.lastIp = clientIp;
    db.upsertStudent({
      fullName: student.fullName,
      email: student.email,
      mobile: student.mobile,
      ip: clientIp,
    });

    res.json({
      success: true,
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        mobile: student.mobile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/google-login
 * Handles Google Sign-In with Single Active Device policy
 */
authRouter.post('/google-login', (req, res) => {
  try {
    const { email, fullName, googleUid, photoUrl, deviceInfo } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Google ইমেইল পাওয়া যায়নি।' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    // Find existing student or register new
    let student = db.getStudentByEmail(cleanEmail);
    if (!student) {
      student = db.upsertStudent({
        fullName: fullName || cleanEmail.split('@')[0] || 'BCA Student',
        email: cleanEmail,
        mobile: '',
        ip: clientIp,
      });
    }

    // Enforce 1 Student = 1 Active Device Policy
    if (deviceInfo?.token) {
      const bindResult = db.checkAndBindStudentDevice({
        userId: student.id,
        userEmail: student.email,
        studentName: student.fullName,
        deviceToken: deviceInfo.token,
        deviceDescription: deviceInfo.userAgent,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        ip: clientIp,
      });

      if (!bindResult.success && bindResult.error === 'DEVICE_ALREADY_ACTIVE') {
        return res.status(403).json({
          success: false,
          error: 'DEVICE_ALREADY_ACTIVE',
          message: bindResult.message || 'আপনার অ্যাকাউন্টটি ইতিমধ্যে অন্য একটি ডিভাইসে সক্রিয় রয়েছে। একটি অ্যাকাউন্টে একসাথে কেবল ১টি ডিভাইসে লগইন রাখা অনুমোদিত। অনুগ্রহ করে আপনার পূর্বের ডিভাইস থেকে লগআউট করুন, অথবা কলেজ অ্যাডমিনের সহায়তা নিন।',
          activeDevice: bindResult.activeDevice,
        });
      }
    }

    student.lastLoginAt = new Date().toISOString();
    student.lastIp = clientIp;

    res.json({
      success: true,
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        mobile: student.mobile,
        collegeName: student.collegeName,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/student-access
 * Unified passwordless Login / Registration using Full Name, Mobile/WhatsApp & Email ID
 * with Single Active Device (1:1) enforcement.
 */
authRouter.post('/student-access', async (req, res) => {
  try {
    const { fullName, email, mobile, deviceInfo } = req.body || {};

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'দয়া করে আপনার সম্পূর্ণ নাম লিখুন।',
      });
    }

    const cleanMobile = String(mobile || '').replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'দয়া করে একটি সঠিক ১০ সংখ্যার WhatsApp / মোবাইল নম্বর লিখুন।',
      });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'দয়া করে আপনার সঠিক ইমেইল আইডি দিন।',
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    let existing =
      db.getStudentByEmailOrMobile(cleanMobile) ||
      db.getStudentByEmailOrMobile(cleanEmail);

    if (!existing) {
      await db.syncWithFirebaseStudents().catch(() => {});
      existing =
        db.getStudentByEmailOrMobile(cleanMobile) ||
        db.getStudentByEmailOrMobile(cleanEmail);
    }

    if (existing) {
      if (deviceInfo?.token) {
        const bindResult = db.checkAndBindStudentDevice({
          userId: existing.id,
          userEmail: cleanEmail || existing.email,
          studentName: fullName.trim() || existing.fullName,
          deviceToken: deviceInfo.token,
          deviceDescription: deviceInfo.userAgent,
          os: deviceInfo.os,
          browser: deviceInfo.browser,
          ip: clientIp,
        });

        if (!bindResult.success && bindResult.error === 'DEVICE_ALREADY_ACTIVE') {
          return res.status(403).json({
            success: false,
            error: 'DEVICE_ALREADY_ACTIVE',
            message:
              bindResult.message ||
              'আপনার অ্যাকাউন্টটি ইতিমধ্যে অন্য একটি ডিভাইসে সক্রিয় রয়েছে। একটি অ্যাকাউন্টে একসাথে কেবল ১টি ডিভাইসে লগইন রাখা অনুমোদিত। অনুগ্রহ করে আপনার পূর্বের ডিভাইস থেকে লগআউট করুন, অথবা অ্যাডমিনের সহায়তা নিন।',
            activeDevice: bindResult.activeDevice,
          });
        }
      }

      const updated = db.upsertStudent({
        fullName: fullName.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        ip: clientIp,
      });

      return res.json({
        success: true,
        student: {
          id: updated.id,
          fullName: updated.fullName,
          email: updated.email,
          mobile: updated.mobile,
        },
      });
    }

    const student = db.upsertStudent({
      fullName: fullName.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      ip: clientIp,
    });

    if (deviceInfo?.token) {
      db.checkAndBindStudentDevice({
        userId: student.id,
        userEmail: student.email,
        studentName: student.fullName,
        deviceToken: deviceInfo.token,
        deviceDescription: deviceInfo.userAgent,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        ip: clientIp,
      });
    }

    return res.json({
      success: true,
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        mobile: student.mobile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/student-logout
 * Releases the active device session so the student can log in from another device!
 */
authRouter.post('/student-logout', (req, res) => {
  try {
    const { studentId } = req.body;
    if (studentId) {
      db.releaseStudentDevice(studentId);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
