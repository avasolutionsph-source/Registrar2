// NAT — the DepEd National Achievement Test. NPS administers it in Grade 6, so
// that is the only level whose sections carry a NAT sheet. Kept out of NatTab
// itself because ClassDetail needs the same rule to decide whether the tab
// exists at all, and a component file may only export components.
export function isNatGrade(gradeLevel?: string): boolean {
  return (gradeLevel || '').split('-')[0] === 'VI';
}
