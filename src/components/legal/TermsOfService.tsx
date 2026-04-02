export const TOS_VERSION = "1.0";

export default function TermsOfService() {
  return (
    <div className="space-y-4 text-foreground/80">
      <h2 className="text-lg font-bold text-foreground">Terms of Service</h2>
      <p className="text-xs text-subtext">Version {TOS_VERSION} — Effective April 2026</p>

      <h3 className="text-sm font-semibold text-foreground">1. Nature of Service</h3>
      <p className="text-sm">RepFlow is a fitness tracking tool designed for logging workouts, nutrition, and progress. RepFlow is not a medical, dietary, or professional health service.</p>

      <h3 className="text-sm font-semibold text-foreground">2. No Medical Advice</h3>
      <p className="text-sm">Content on this platform, including recommendations made by coaches, does not constitute medical, nutritional, or professional health advice. Always consult a qualified healthcare professional before beginning any exercise or nutrition program.</p>

      <h3 className="text-sm font-semibold text-foreground">3. Assumption of Risk</h3>
      <p className="text-sm">You acknowledge that physical exercise and dietary changes carry inherent risks including but not limited to physical injury, illness, or death. You assume full responsibility for your health decisions and any consequences thereof.</p>

      <h3 className="text-sm font-semibold text-foreground">4. Limitation of Liability</h3>
      <p className="text-sm">To the maximum extent permitted by applicable law, RepFlow, its operators, affiliates, coaches, and contributors shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to damages for personal injury, loss of profits, data, or goodwill, arising from or related to your use of the service.</p>

      <h3 className="text-sm font-semibold text-foreground">5. Indemnification</h3>
      <p className="text-sm">You agree to indemnify, defend, and hold harmless RepFlow and its operators from any claims, damages, losses, liabilities, costs, or expenses (including reasonable legal fees) arising from your use of the service, violation of these terms, or infringement of any third-party rights.</p>

      <h3 className="text-sm font-semibold text-foreground">6. User Conduct</h3>
      <p className="text-sm">You agree not to misuse the platform, provide harmful advice, impersonate qualified professionals, or engage in any activity that violates applicable laws or regulations.</p>

      <h3 className="text-sm font-semibold text-foreground">7. Data Privacy</h3>
      <p className="text-sm">By using RepFlow, you consent to the collection, processing, and storage of your fitness data as required to provide the service. When connecting with a coach, you acknowledge that the coach will have access to your workout logs, body weight, nutrition data, and progress metrics.</p>

      <h3 className="text-sm font-semibold text-foreground">8. Account Termination</h3>
      <p className="text-sm">RepFlow reserves the right to suspend or terminate any account at its sole discretion, with or without notice, for any reason including violation of these terms.</p>

      <h3 className="text-sm font-semibold text-foreground">9. Age Requirement</h3>
      <p className="text-sm">You must be at least 18 years of age to use RepFlow. By using the service, you represent that you meet this requirement.</p>

      <h3 className="text-sm font-semibold text-foreground">10. Modifications</h3>
      <p className="text-sm">RepFlow may update these terms at any time. Continued use of the service after changes constitutes acceptance of the updated terms. You will be notified of material changes and asked to re-accept.</p>

      <h3 className="text-sm font-semibold text-foreground">11. Governing Law</h3>
      <p className="text-sm">These terms are governed by the laws of India. Any disputes shall be resolved through binding arbitration in accordance with applicable arbitration rules, with the seat of arbitration in India.</p>

      <h3 className="text-sm font-semibold text-foreground">12. Severability</h3>
      <p className="text-sm">If any provision of these terms is found unenforceable, the remaining provisions shall remain in full force and effect.</p>

      <h3 className="text-sm font-semibold text-foreground">13. Entire Agreement</h3>
      <p className="text-sm">These Terms of Service constitute the entire agreement between you and RepFlow regarding the use of the service and supersede all prior agreements.</p>
    </div>
  );
}
