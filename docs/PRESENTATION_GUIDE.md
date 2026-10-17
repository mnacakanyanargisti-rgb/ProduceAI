# ProduceAI — University Presentation Guide (English / Հայերեն)

**Audience:** Machine Learning / Algorithms and Programming Systems lecturer  
**Suggested duration:** 8–10 minutes  
**Start with the [GitHub repository](https://github.com/mnacakanyanargisti-rgb/ProduceAI), then show the [live website](https://mnacakanyanargisti-rgb.github.io/ProduceAI/).**

This guide describes **implemented code and recorded evidence** as of October 2026. Do not imply that the experimental A/B/C grade is a physical freshness measurement or a validated surface-defect segmentation.

## 1. Introduce the real problem (1 minute)

> **EN:** Good afternoon. Today I will present ProduceAI, a computer-vision research project for understanding the visible condition of apples. Fruit sorting is often manual and subjective. I am exploring whether supervised image classification can make the first screening step more consistent.
>
> **HY:** Բարի օր։ Այսօր կներկայացնեմ ProduceAI-ն՝ համակարգչային տեսողության հետազոտական նախագիծ, որը ուսումնասիրում է խնձորների տեսանելի վիճակը։ Մրգերի տեսակավորումը հաճախ ձեռքով է կատարվում և սուբյեկտիվ է։ Ես ուսումնասիրում եմ՝ արդյոք վերահսկվող պատկերային դասակարգումը կարող է նախնական ստուգումն ավելի միատեսակ դարձնել։

## 2. Show the GitHub structure (1 minute)

Open the root folders in this order: `frontend/`, `backend/`, `ml/`, `experiments/`, `docs/`, `.github/workflows/`.

> **EN:** I separated the user interface, the optional API, the machine-learning pipeline, the experimental results and the documentation. GitHub Actions automates tests, model publication and website deployment.
>
> **HY:** Ես առանձնացրել եմ օգտատիրոջ միջերեսը, ընտրովի API-ն, մեքենայական ուսուցման գործընթացը, փորձերի արդյունքներն ու փաստաթղթերը։ GitHub Actions-ն ավտոմատացնում է թեստավորումը, մոդելի հրապարակումը և կայքի տեղադրումը։

## 3. Explain the ML pipeline — the core of the project (3 minutes)

### A. Dataset preparation

**Open:** [ml/split.py](../ml/split.py) and [ml/eda.py](../ml/eda.py).

> **EN:** I use a stratified data split: 70 percent for training, 15 percent for validation and 15 percent for testing. The script checks exact-image duplicates and records dataset provenance. One remaining risk is near-duplicate images of the same apple across sets.
>
> **HY:** Օգտագործում եմ տվյալների շերտավորված բաժանում՝ 70 տոկոս ուսուցման, 15 տոկոս վավերացման և 15 տոկոս թեստավորման համար։ Սքրիպտը ստուգում է նույնական պատկերների կրկնությունները և գրանցում տվյալների աղբյուրները։ Մնացած ռիսկերից մեկն այն է, որ նույն խնձորի նմանատիպ լուսանկարները կարող են հայտնվել տարբեր բաժիններում։

### B. Image models and preprocessing

**Open:** [ml/models.py](../ml/models.py).

> **EN:** This file defines three classes — Fresh Apple, Rotten or Defective Apple, and Not an Apple. Neural inputs are resized to 224 by 224 pixels and normalized. I implemented a custom CNN and adapted the pretrained MobileNetV2 architecture.
>
> **HY:** Այս ֆայլում սահմանված են երեք դասեր՝ թարմ խնձոր, փչացած կամ վնասված խնձոր և ոչ խնձոր։ Նեյրոնային ցանցի մուտքային պատկերները չափափոխվում են 224×224 պիքսելի և նորմալացվում։ Կոդում իրականացված են սեփական CNN և նախապես ուսուցանված MobileNetV2-ի հարմարեցված տարբերակը։

### C. Training

**Open:** [ml/train.py](../ml/train.py). Point to `SVC()`, `CrossEntropyLoss()`, `loss.backward()`, `optimizer.step()`.

> **EN:** I prepared three approaches: a traditional SVM using engineered OpenCV features, a CNN trained from scratch, and MobileNetV2 with transfer learning. The published model is MobileNetV2; the SVM and CNN have training implementations but no comparable published evaluation yet.
>
> **HY:** Նախապատրաստել եմ երեք մոտեցում՝ OpenCV-ի միջոցով ստացված հատկանիշներով SVM, զրոյից ուսուցանվող CNN և փոխանցմամբ ուսուցում օգտագործող MobileNetV2։ Հրապարակված մոդելը MobileNetV2-ն է․ SVM-ի և CNN-ի ուսուցման կոդը կա, բայց դրանց համադրելի հրապարակված գնահատումները դեռ չկան։

### D. Evaluation

**Open:** [ml/evaluate.py](../ml/evaluate.py), then [published results.json](../frontend/public/experiments/results.json).

> **EN:** The recorded MobileNetV2 test achieved 95.05 percent classification accuracy and 95.56 percent macro F1 on 222 held-out images. An additional 180-image external apple test recorded 92.22 percent correct fresh-versus-defective predictions. These are recorded research results, not a guarantee for every photograph.
>
> **HY:** MobileNetV2-ի գրանցված թեստում ստացվել է 95.05 տոկոս դասակարգման ճշտություն և 95.56 տոկոս մակրո F1՝ առանձնացված 222 պատկերների վրա։ Արտաքին 180 խնձորի լուսանկարների թեստում գրանցվել է 92.22 տոկոս ճիշտ կանխատեսում՝ թարմ և վնասված խնձորների միջև։ Սրանք հետազոտական գրանցված արդյունքներ են, ոչ թե ցանկացած լուսանկարի ճիշտ գնահատման երաշխիք։

## 4. Explain the browser inference (1 minute)

**Open:** [frontend/src/browser-model.ts](../frontend/src/browser-model.ts), [frontend/public/models/manifest.json](../frontend/public/models/manifest.json), and [frontend/src/apple-grading.ts](../frontend/src/apple-grading.ts).

> **EN:** The trained MobileNetV2 is exported to ONNX so the live website can process a photo directly in the browser, even without a Python backend. The model returns class probabilities. My code may abstain on an uncertain result rather than give an unjustified grade.
>
> **HY:** Ուսուցանված MobileNetV2-ը արտահանված է ONNX ձևաչափով, որպեսզի կայքը կարողանա մշակել լուսանկարը անմիջապես բրաուզերում՝ նույնիսկ առանց Python backend-ի։ Մոդելը վերադարձնում է դասերի հավանականությունները։ Անորոշ արդյունքի դեպքում կոդը կարող է հրաժարվել գնահատական տալուց։

> **EN:** The displayed A, B or C is a preliminary research score derived from two class probabilities, not measured surface damage or scientifically calibrated freshness.
>
> **HY:** Ցուցադրվող A, B կամ C-ն նախնական հետազոտական միավոր է, որը հաշվարկվում է երկու դասերի հավանականություններից, ոչ թե չափված մակերեսային վնասվածքից կամ գիտականորեն չափորոշված թարմությունից։

## 5. Demonstrate the website (2 minutes)

**Open:** https://mnacakanyanargisti-rgb.github.io/ProduceAI/

1. **Home:** briefly describe the problem and workflow.
2. **AI Scanner:** upload a well-lit, close image of **one fresh apple**; then, if available, a clearly defective apple and a clearly non-apple object. Treat unexpected results as model limitations, not successful detections.
3. **Model Comparison:** point to **recorded** MobileNetV2 metrics, not the illustrative SVM/CNN cards.
4. **Analytics:** explain browser-local prediction history, not a centralized orchard inventory.
5. **Research:** summarize the methodology and planned improvements.

> **EN:** I can demonstrate classification, probabilities, preliminary research grades and recorded evaluation results. The website is not yet a validated commercial sorter.
>
> **HY:** Կարող եմ ցուցադրել դասակարգումը, հավանականությունները, նախնական հետազոտական գնահատականները և գրանցված փորձերի արդյունքները։ Կայքը դեռ հաստատված առևտրային տեսակավորող համակարգ չէ։

## 6. Close with limitations and next steps (1 minute)

> **EN:** My next steps are to collect independently photographed Armenian apples, perform group-aware external evaluation, train a segmentation model on annotated defects, and validate any quality thresholds with agricultural experts.
>
> **HY:** Իմ հաջորդ քայլերն են՝ հավաքել Հայաստանում անկախ նկարահանված խնձորների լուսանկարներ, կատարել խմբերը հաշվի առնող արտաքին գնահատում, ուսուցանել նշագրված թերությունների սեգմենտացիոն մոդել և որակի ցանկացած շեմ ստուգել գյուղատնտեսության մասնագետների հետ։

## Likely lecturer questions

**Q: Why MobileNetV2 instead of KNN?**  
**EN:** It is an image-oriented convolutional architecture with pretrained visual representations. KNN can be a useful baseline on extracted features, but it is not necessarily a strong approach for raw high-dimensional pixels.  
**HY:** Այն պատկերների համար նախատեսված կոնվոլյուցիոն կառուցվածք է՝ նախապես սովորած տեսողական հատկանիշներով։ KNN-ը կարող է օգտակար բազային մեթոդ լինել ստացված հատկանիշների վրա, սակայն միշտ չէ, որ արդյունավետ է հում բարձրաչափ պիքսելների դեպքում։

**Q: What is the difference between training and inference?**  
**EN:** Training adjusts model parameters using labeled examples; inference uses the resulting model to predict new image labels.  
**HY:** Ուսուցումը պիտակավորված օրինակներով ճշգրտում է մոդելի պարամետրերը, իսկ կանխատեսման փուլում ստացված մոդելը որոշում է նոր պատկերների դասերը։

**Q: Is your 95.05% classification accuracy also A/B/C grading accuracy?**  
**EN:** No. The measured task is three-class image classification. My A/B/C conversion is exploratory and has no independent commercial-grade validation.  
**HY:** Ոչ։ Չափված խնդիրը պատկերների երեք դասով դասակարգումն է։ Իմ A/B/C փոխակերպումը փորձնական է և չունի անկախ հաստատված առևտրային որակի գնահատում։

**Q: What does the Not an Apple class guarantee?**  
**EN:** Nothing absolute. The model has selected negative examples in training and testing, but unseen objects and unusual views can still produce mistakes or uncertainty.  
**HY:** Բացարձակ երաշխիք չի տալիս։ Մոդելն ուսուցվել և ստուգվել է ընտրված ոչ խնձոր օրինակներով, բայց չտեսած առարկաներն ու անսովոր լուսանկարները կարող են սխալ կամ անորոշ արդյունք առաջացնել։

## Presentation checklist

- Open GitHub and the website in separate tabs before class.
- Prepare three appropriate sample photos, and an offline screenshot backup for a network interruption.
- Show at least one actual function (`train_test_split`, `build_model`, `optimizer.step`, or `classifyAppleInBrowser`) rather than only visual designs.
- Be ready to explain **accuracy, precision, recall, F1, overfitting, transfer learning and inference**.
- State clearly: *classification ≠ segmentation ≠ validated A/B/C commercial grading*.
