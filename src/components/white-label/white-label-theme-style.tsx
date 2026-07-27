/**
 * Injects org theme CSS variables into the document head (server-rendered).
 */

export function WhiteLabelThemeStyle({
  cssText,
}: {
  cssText: string;
}) {
  if (!cssText.trim()) return null;
  return (
    <style
      id="storaflow-white-label-theme"
      dangerouslySetInnerHTML={{ __html: cssText }}
    />
  );
}
