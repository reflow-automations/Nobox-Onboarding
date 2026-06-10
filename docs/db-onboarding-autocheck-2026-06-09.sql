-- Nobox onboarding: checklist auto-check + item-7 rename + (optioneel) testdata opschonen
-- Project: djarvwzvbxlcnxkxczpc (Supabase "Orakel chat")
-- Draai dit in de Supabase SQL-editor. Claude's MCP-verbinding is read-only, daarom handmatig.
-- Datum: 2026-06-09

-- ============================================================
-- 1) Seed-functie: standaard checklist-item 7 hernoemen (vault -> onetimesecret)
--    (rest identiek aan de bestaande functie)
-- ============================================================
CREATE OR REPLACE FUNCTION public.insert_default_checklist_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.onboarding_checklist_items (intake_id, label, sort_order, is_default)
  VALUES
    (NEW.id, 'Kick-off meeting gepland', 1, true),
    (NEW.id, 'Toegangen ontvangen (alle platforms)', 2, true),
    (NEW.id, 'Brand guide / huisstijl ontvangen', 3, true),
    (NEW.id, 'Drive-folder klaargezet', 4, true),
    (NEW.id, 'ClickUp-space klaargezet', 5, true),
    (NEW.id, 'Welkomstmail verstuurd', 6, true),
    (NEW.id, 'Inloggegevens ontvangen (onetimesecret)', 7, true),
    (NEW.id, 'Klantgesprekken ingepland (3-5)', 8, true),
    (NEW.id, 'Concurrentieanalyse opgeleverd', 9, true),
    (NEW.id, 'Strategie-sessie ingepland', 10, true);
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 2) Auto-check: zet items 4/5/6 op done bij statuswijziging (n8n zet de status al)
-- ============================================================
CREATE OR REPLACE FUNCTION public.autocheck_checklist_on_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'drive_created' THEN
      UPDATE public.onboarding_checklist_items SET done = true
        WHERE intake_id = NEW.id AND is_default AND sort_order = 4 AND done = false;
    ELSIF NEW.status = 'clickup_created' THEN
      UPDATE public.onboarding_checklist_items SET done = true
        WHERE intake_id = NEW.id AND is_default AND sort_order IN (4, 5) AND done = false;
    ELSIF NEW.status = 'mails_sent' THEN
      UPDATE public.onboarding_checklist_items SET done = true
        WHERE intake_id = NEW.id AND is_default AND sort_order IN (4, 5, 6) AND done = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_intake_status_autocheck ON public.onboarding_intakes;
CREATE TRIGGER on_intake_status_autocheck
  AFTER UPDATE OF status ON public.onboarding_intakes
  FOR EACH ROW EXECUTE FUNCTION public.autocheck_checklist_on_status();

-- ============================================================
-- 3) Bestaande rijen: label hernoemen (vault -> onetimesecret)
-- ============================================================
UPDATE public.onboarding_checklist_items
   SET label = 'Inloggegevens ontvangen (onetimesecret)'
 WHERE label = 'Vault-link gedeeld';

-- ============================================================
-- 4) (DESTRUCTIEF, optioneel) Testdata opschonen: 4 testrijen weg, 'E2E Full Flow Test BV' behouden
--    Run dit blok alleen als je de oude testklanten echt wilt verwijderen.
-- ============================================================
DELETE FROM public.onboarding_checklist_items
 WHERE intake_id IN (
   SELECT id FROM public.onboarding_intakes
    WHERE bedrijfsnaam IN ('Supabase Eerste Test BV','Drive Branch Test BV','Template Test Recruitment','jdcbjd')
 );
DELETE FROM public.onboarding_intake_logs
 WHERE intake_id IN (
   SELECT id FROM public.onboarding_intakes
    WHERE bedrijfsnaam IN ('Supabase Eerste Test BV','Drive Branch Test BV','Template Test Recruitment','jdcbjd')
 );
DELETE FROM public.onboarding_intakes
 WHERE bedrijfsnaam IN ('Supabase Eerste Test BV','Drive Branch Test BV','Template Test Recruitment','jdcbjd');

-- ============================================================
-- 5) Backfill: vink de 3 zekere items af op reeds gevorderde rijen (bv. de behouden E2E-rij)
-- ============================================================
UPDATE public.onboarding_checklist_items ci
   SET done = true
  FROM public.onboarding_intakes i
 WHERE ci.intake_id = i.id
   AND ci.is_default
   AND (
        (i.status IN ('drive_created','clickup_created','mails_sent') AND ci.sort_order = 4) OR
        (i.status IN ('clickup_created','mails_sent')                 AND ci.sort_order = 5) OR
        (i.status = 'mails_sent'                                       AND ci.sort_order = 6)
   )
   AND ci.done = false;
