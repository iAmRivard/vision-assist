export const visionPrompt = `Analiza la imagen e identifica el objeto principal ubicado cerca del centro.
Devuelve únicamente JSON válido con: objectName, category, brand, model, confidence,
description, visibleText y warnings. Marca y modelo deben ser null salvo que sean visibles
o altamente probables. No inventes características. Si no puedes reconocer el objeto usa
"Objeto no identificado" y una confianza baja.`;
