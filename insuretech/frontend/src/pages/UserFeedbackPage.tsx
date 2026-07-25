import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../layouts/UserLayout";
import type { Section } from "../components/UserSidebar";
import { FeedbackForm, FeedbackList } from "../features/feedback";

export default function UserFeedbackPage() {
  const navigate = useNavigate();

  const handleSectionChange = useCallback(
    (section: Section) => {
      if (section === "profile") {
        navigate("/dashboard");
        return;
      }

      if (section === "profiling") {
        navigate("/dashboard/profiling");
        return;
      }

      if (section === "feedback") {
        navigate("/dashboard/feedback");
        return;
      }

      if (section === "recommendation") {
        navigate("/dashboard/profiling");
        return;
      }

      if (section === "comparison") {
        navigate("/dashboard/comparison");
        return;
      }

      if (section === "chatbot") {
        navigate("/dashboard/comparison", { state: { openChat: true } });
      }
    },
    [navigate],
  );

  return (
    <UserLayout
      activeSection="feedback"
      onSectionChange={handleSectionChange}
      contentClassName="w-full"
    >
      <div className="mx-auto flex min-h-[calc(100vh-136px)] max-w-4xl flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl text-center">
          <p className="mb-4 inline-flex rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Feedback center
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
            Share your feedback with us
          </h1>
          <p className="mt-4 text-base leading-7 text-text-secondary">
            Tell us what worked well and what could be better. Your input helps
            improve the recommendation journey and overall product experience.
          </p>
        </div>

        <FeedbackForm />
        
      </div>
    </UserLayout>
  );
}
