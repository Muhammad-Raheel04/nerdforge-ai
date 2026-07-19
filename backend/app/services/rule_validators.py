# backend/app/services/rule_validators.py
"""
Real syntax validation for generated detection rules.

Trusting an LLM to produce syntactically valid Sigma YAML or YARA source is
unreliable on its own - the model can produce something that *looks*
plausible but doesn't actually parse/compile. These validators use the same
tooling the security ecosystem actually uses to consume these rules:

- Sigma: pySigma's own rule parser (the reference implementation used by
  Sigma tooling generally)
- YARA: yara-python, which wraps the real libyara compiler - if
  yara.compile() accepts it, any real YARA engine will too

Both return a specific, human-readable error message on failure so it can be
fed back to the LLM as corrective context, rather than just "try again".
"""
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

try:
    from sigma.rule import SigmaRule
    from sigma.exceptions import SigmaError
    _SIGMA_AVAILABLE = True
except ImportError:
    _SIGMA_AVAILABLE = False
    logger.warning("pysigma not installed - Sigma rules will not be syntax-validated")

try:
    import yara
    _YARA_AVAILABLE = True
except ImportError:
    _YARA_AVAILABLE = False
    logger.warning("yara-python not installed - YARA rules will not be syntax-validated")


def validate_sigma(rule_yaml: str) -> Tuple[bool, str]:
    """Parse a Sigma rule with pySigma's reference parser. Returns (is_valid, error_message)."""
    if not _SIGMA_AVAILABLE:
        return True, ""  # degrade gracefully if the dependency is missing

    if not rule_yaml or not rule_yaml.strip():
        return False, "Rule content is empty."

    try:
        SigmaRule.from_yaml(rule_yaml)
        return True, ""
    except SigmaError as e:
        return False, str(e)
    except Exception as e:
        # pySigma can raise plain YAML errors etc. for badly malformed input
        return False, f"Failed to parse as Sigma YAML: {e}"


def validate_yara(rule_text: str) -> Tuple[bool, str]:
    """Compile a YARA rule with the real libyara compiler via yara-python.
    Returns (is_valid, error_message)."""
    if not _YARA_AVAILABLE:
        return True, ""  # degrade gracefully if the dependency is missing

    if not rule_text or not rule_text.strip():
        return False, "Rule content is empty."

    try:
        yara.compile(source=rule_text)
        return True, ""
    except yara.SyntaxError as e:
        return False, str(e)
    except yara.Error as e:
        return False, f"YARA compile error: {e}"
    except Exception as e:
        return False, f"Failed to compile as YARA: {e}"


def validate_rule(rule_content: str, rule_format: str) -> Tuple[bool, str]:
    """Dispatch to the correct validator for the given rule_format."""
    if rule_format == "sigma":
        return validate_sigma(rule_content)
    if rule_format == "yara":
        return validate_yara(rule_content)
    return True, ""
