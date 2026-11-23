#!/usr/bin/env python3
"""Ensambla un HTML autocontenido de explica-visual.

Uso:
    python3 scripts/ensamblar.py <concepto.js> <salida.html>

Toma assets/base.html y le incrusta assets/motor.css, assets/motor.js y el
archivo de concepto. El resultado no tiene dependencias externas: se abre
con doble clic desde el disco.
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / "assets"


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 1
    concepto_path, salida = Path(sys.argv[1]), Path(sys.argv[2])
    concepto = concepto_path.read_text(encoding="utf-8")
    if "window.CONCEPTO" not in concepto:
        print("El concepto debe asignar window.CONCEPTO = { ... }", file=sys.stderr)
        return 1

    m = re.search(r"titulo\s*:\s*['\"`]([^'\"`]+)", concepto)
    titulo = (m.group(1) if m else "Concepto") + " · explica-visual"

    html = (RAIZ / "base.html").read_text(encoding="utf-8")
    # Reemplazos con funciones para que las barras invertidas del JS no se interpreten.
    partes = {
        "{{TITULO}}": titulo,
        "{{CSS}}": (RAIZ / "motor.css").read_text(encoding="utf-8"),
        "{{CONCEPTO}}": concepto.replace("</script", "<\\/script"),
        "{{MOTOR}}": (RAIZ / "motor.js").read_text(encoding="utf-8"),
    }
    for clave, valor in partes.items():
        html = html.replace(clave, valor)

    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(html, encoding="utf-8")
    print(f"OK → {salida} ({len(html) // 1024} KB)")
    return revisar_sintaxis(concepto_path)


def revisar_sintaxis(concepto_path: Path) -> int:
    """Si hay Node instalado, revisa la sintaxis del concepto y del motor."""
    if not shutil.which("node"):
        print("(node no está instalado: se omite la revisión de sintaxis)")
        return 0
    errores = 0
    for js in (concepto_path, RAIZ / "motor.js"):
        r = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
        if r.returncode != 0:
            errores += 1
            print(f"Error de sintaxis en {js}:\n{r.stderr}", file=sys.stderr)
    if not errores:
        print("Sintaxis JS correcta.")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
