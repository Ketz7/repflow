export const COACHING_WAIVER_VERSION = "1.0";

export default function CoachingWaiver() {
  return (
    <div className="space-y-4 text-foreground/80">
      <h2 className="text-lg font-bold text-foreground">Coaching Services Waiver</h2>
      <p className="text-xs text-subtext">Version {COACHING_WAIVER_VERSION} — Effective April 2026</p>

      <h3 className="text-sm font-semibold text-foreground">1. Independent Relationship</h3>
      <p className="text-sm">Coaches on RepFlow are independent service providers. They are not employees, agents, or representatives of RepFlow. RepFlow does not control, direct, or supervise coaching services.</p>

      <h3 className="text-sm font-semibold text-foreground">2. Not Professional Advice</h3>
      <p className="text-sm">Coaching provided through RepFlow is general fitness guidance only. It does not constitute licensed medical, nutritional, physiotherapy, or any other form of professional healthcare advice.</p>

      <h3 className="text-sm font-semibold text-foreground">3. Coach Qualifications</h3>
      <p className="text-sm">RepFlow does not verify, certify, endorse, or guarantee the qualifications, credentials, or competence of any coach. You should independently verify your coach&apos;s credentials and suitability before following their recommendations.</p>

      <h3 className="text-sm font-semibold text-foreground">4. Assumption of Risk</h3>
      <p className="text-sm">You acknowledge and accept that following any coach&apos;s program, nutrition targets, or recommendations is done entirely at your own risk. You are solely responsible for determining whether any exercise or dietary recommendation is appropriate for your individual health condition.</p>

      <h3 className="text-sm font-semibold text-foreground">5. No Guarantee of Results</h3>
      <p className="text-sm">Neither RepFlow nor any coach guarantees any specific fitness, health, body composition, or aesthetic outcomes. Results vary based on individual factors beyond the control of the platform or coach.</p>

      <h3 className="text-sm font-semibold text-foreground">6. Liability Waiver</h3>
      <p className="text-sm">To the maximum extent permitted by law, you waive all claims, demands, and causes of action against RepFlow, its operators, and affiliates arising from or related to the coaching relationship. Any disputes regarding coaching services are solely between you and your coach.</p>

      <h3 className="text-sm font-semibold text-foreground">7. Data Sharing Consent</h3>
      <p className="text-sm">By entering a coaching relationship, you explicitly consent to your coach viewing your workout logs, body weight data, nutrition logs (macros, calories, steps), progress metrics, and personal records for the duration of the coaching relationship.</p>

      <h3 className="text-sm font-semibold text-foreground">8. Termination</h3>
      <p className="text-sm">Either party may end the coaching relationship at any time through the app. Upon termination, the coach&apos;s access to your data will be revoked.</p>
    </div>
  );
}
