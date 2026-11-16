import React from 'react';
import {
  X,
  ArrowLeft,
  BookOpen,
  Target,
  Compass,
  ShieldAlert,
  Wallet,
  Copyright,
  GraduationCap,
} from 'lucide-react';
import { BRAND } from '../constants/brand';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPage?: boolean;
}

const DISCLAIMER_POINTS: string[] = [
  'BCA Study Point is an independent educational resource platform and is not affiliated with, associated with, sponsored by, or officially endorsed by any college, university, educational board, or government authority.',
  "All materials are provided for educational and reference purposes only. They are intended to support students' preparation and should not be considered a substitute for official textbooks, classroom teaching, university notices, or prescribed syllabuses.",
  'We do not guarantee that any particular question, topic, or study material will appear in university examinations. Students are advised to follow their official syllabus and academic guidelines.',
  'BCA Study Point does not claim to provide guaranteed examination questions, confirmed suggestions, or guaranteed academic results.',
  'Any university, institution, course, subject, or examination names mentioned on this platform are used solely for identification and educational reference purposes.',
  'Students are responsible for verifying academic information against official sources whenever necessary.',
];

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, isPage = false }) => {
  if (!isOpen) return null;

  return (
    <div
      className={
        isPage
          ? 'min-h-[80vh] flex flex-col items-center px-3 sm:px-6 py-4 sm:py-8'
          : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md'
      }
    >
      {isPage && (
        <div className="w-full max-w-4xl mb-3 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFE7A3] hover:text-white px-3.5 py-2 rounded-xl bg-black/45 border border-[#FFE7A3]/30 hover:border-[#FFD34E]/60 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
          <span className="text-[11px] font-semibold text-white/65">
            About &amp; Academic Disclaimer
          </span>
        </div>
      )}

      <div
        className={`w-full max-w-4xl rounded-3xl border border-[#FFE7A3]/30 shadow-2xl relative text-left bg-gradient-to-b from-[#3B040D]/95 via-[#240208]/95 to-[#160105]/98 backdrop-blur-xl ${
          isPage ? 'p-4 sm:p-7' : 'max-h-[90vh] overflow-y-auto p-4 sm:p-7 my-auto'
        }`}
      >
        {!isPage && (
          <button
            onClick={onClose}
            aria-label="Close About dialog"
            className="absolute top-4 right-4 p-2 text-white/65 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* 1. Hero Identity & Platform Overview */}
        <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-[#6D0011]/85 via-[#4A000C]/90 to-[#2B0007]/95 border border-[#FFD34E]/35 shadow-lg mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4 mb-4">
            <img
              src={BRAND.logoUrl}
              alt="BCA Study Point Logo"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-[#FFD34E]/70 shadow-md shrink-0"
            />
            <div>
              <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
                About BCA Study Point
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-[#FFD34E]">
                Independent Student-Oriented Educational Resource Platform
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-white/90 leading-relaxed">
            <p>
              <strong className="text-[#FFE7A3]">BCA Study Point</strong> is an independent
              student-oriented educational resource platform created with the aim of making academic
              study materials more accessible and convenient for BCA students.
            </p>
            <div className="rounded-xl bg-black/30 border border-white/10 p-3.5 flex items-start gap-3">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFD34E] shrink-0 mt-0.5" />
              <p className="text-white/85">
                The platform is developed from a student&apos;s perspective to help fellow students
                access useful study resources, including subject-wise notes, question banks, study
                suggestions, and other academic reference materials.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Objective & Vision (Distinct Emerald & Sky Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-emerald-950/80 to-emerald-900/40 border border-emerald-400/35">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-emerald-200">
                Our Objective
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-emerald-50/90 leading-relaxed">
              Our objective is to support students in their academic preparation by providing
              organized and easily accessible learning resources at affordable prices.
            </p>
          </div>

          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-sky-950/80 to-sky-900/40 border border-sky-400/35">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-sky-200">
                Structured Learning Access
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-sky-50/90 leading-relaxed">
              We believe that access to organized study resources can make academic preparation
              easier. BCA Study Point aims to create a convenient learning resource platform where
              students can find relevant materials according to their semester, subjects, and
              specialization.
            </p>
          </div>
        </div>

        {/* 3. Independence & Academic Disclaimer (Numbered 1-6, Warm Amber Theme) */}
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-amber-950/60 via-[#2E1A04]/75 to-black/60 border border-amber-400/40 mb-5">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/45 flex items-center justify-center text-amber-300 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-amber-200">
                Independence &amp; Academic Guidelines
              </h2>
              <p className="text-[11px] text-amber-200/70">
                Important points regarding platform scope and reference use
              </p>
            </div>
          </div>

          <ol className="space-y-2.5">
            {DISCLAIMER_POINTS.map((point, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 rounded-xl bg-black/35 border border-amber-300/15"
              >
                <span className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/40 text-[#FFD34E] text-xs font-extrabold flex items-center justify-center shrink-0 tabular-nums mt-0.5">
                  {index + 1}
                </span>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed">{point}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* 4. Pricing & Intellectual Property (Violet & Teal Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-violet-950/75 to-purple-900/35 border border-violet-400/35">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-400/40 flex items-center justify-center text-violet-300 shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-violet-200">
                Transparent &amp; Optional Pricing
              </h2>
            </div>
            <div className="space-y-2.5 text-xs sm:text-sm text-violet-50/90 leading-relaxed">
              <p>
                A nominal amount may be charged for access to certain digital materials and services
                to cover applicable preparation, organization, digital hosting, maintenance, and
                platform-related expenses.
              </p>
              <p className="font-medium text-violet-100">
                All applicable prices and package details are displayed before purchase. Purchasing
                any material is optional.
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-teal-950/75 to-cyan-900/35 border border-teal-400/35">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
                <Copyright className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-teal-200">
                Intellectual Property Rights
              </h2>
            </div>
            <div className="space-y-2.5 text-xs sm:text-sm text-teal-50/90 leading-relaxed">
              <p>
                All original content, designs, and materials created by BCA Study Point remain
                subject to their applicable intellectual property rights.
              </p>
              <p>
                Third-party content, trademarks, and educational references belong to their
                respective owners. We do not claim ownership of materials belonging to third parties.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Closing Mission & Signature */}
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#5E0010]/90 via-[#42000B]/95 to-[#2D0007]/95 border border-[#FFD34E]/45 text-center space-y-3">
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-2xl mx-auto">
            Our aim is to make academic resources accessible, organized, and affordable for
            students while maintaining transparency, responsible practices, and respect for
            intellectual property.
          </p>
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#FFD34E]/15 border border-[#FFD34E]/45 text-[#FFD34E] font-extrabold text-sm sm:text-base">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>BCA Study Point – Your Study Partner.</span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-5 pt-4 border-t border-white/15 flex justify-end">
          <button
            onClick={onClose}
            className="btn-gold-primary px-6 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            {isPage ? 'Back to Storefront' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
