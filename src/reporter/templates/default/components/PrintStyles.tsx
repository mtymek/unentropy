export function PrintStyles() {
  const css = `
    @media print {
      body { background: white !important; }
      .no-print { display: none !important; }
      .metric-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      canvas { max-height: 300px; }
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
