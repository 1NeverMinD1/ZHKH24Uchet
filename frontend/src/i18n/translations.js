import { dataMessages } from "./messagesData";
import { authMessages } from "./messagesAuth";

export const translations = {
  ru: {
    "header.menu": "Меню",
    "header.companies": "Компании",
    "header.registries": "Реестры",
    "header.about": "О сервисе",
    "header.soon": "Скоро",
    "header.login": "Войти",
    "header.register": "Регистрация",
    "header.profile": "Личный профиль",
    "header.logout": "Выйти",

    "home.seoTitle": "Проверка компаний Казахстана по БИН и названию",
    "home.seoDescription":
      "Проверка компаний Казахстана по БИН и названию: руководитель, юридический адрес и вид деятельности по данным открытых государственных реестров.",

    "hero.badge": "Открытые данные госреестров РК",
    "hero.titleStart": "Проверьте любую компанию Казахстана",
    "hero.titleAccent": "за 1 минуту",
    "hero.intro":
      "БИН, руководитель, адрес, вид деятельности — по данным 10+ официальных государственных источников",
    "hero.placeholder": "Введите название, БИН или ИИН компании",
    "hero.button": "Найти",
    "hero.try": "Попробуйте:",

    "summary.companies.value": "1.2 млн+",
    "summary.companies.label": "Компаний и ИП в базе",
    "summary.sources.value": "10+",
    "summary.sources.label": "Официальных источников",
    "summary.history.value": "5 лет",
    "summary.history.label": "Накопленной хронологии",
    "summary.indicators.value": "30+",
    "summary.indicators.label": "Показателей для анализа",

    "cities.title": "Предприятия по городам",
    "cities.all": "Все населённые пункты",
    "cities.count": "предприятий",
    "city.almaty": "Алматы",
    "city.astana": "Астана",
    "city.shymkent": "Шымкент",
    "city.aktau": "Актау",
    "city.atyrau": "Атырау",

    "tutorial.title": "Как работать с сервисом",
    "tutorial.step1.title": "Введите БИН или название",
    "tutorial.step1.text":
      "Поиск работает по любому идентификатору — названию компании, БИН, ИИН руководителя.",
    "tutorial.step2.title": "Изучите карточку компании",
    "tutorial.step2.text":
      "Руководитель, юридический адрес, вид деятельности и дата регистрации — на одной странице.",
    "tutorial.step3.title": "Примите решение",
    "tutorial.step3.text":
      "Проверьте благонадёжность партнёра перед сделкой, не выходя из сервиса.",

    "source.title": "Данные из официальных источников",

    "footer.intro":
      "Проект на основе открытых государственных данных Республики Казахстан.",
    "footer.service": "Сервис",
    "footer.companies": "Компании",
    "footer.cities": "Города",
    "footer.oked": "ОКЭД",
    "footer.about": "О нас",
    "footer.contacts": "Контакты",
    "footer.faq": "FAQ",
    "footer.legal": "Правовое",
    "footer.terms": "Соглашение",
    "footer.privacy": "Политика данных",
    "footer.rights": "© 2026 Реестр.kz — Все права защищены",
    "footer.basedOn": "Данные основаны на открытых реестрах РК",
  },
  kk: {
    "header.menu": "Мәзір",
    "header.companies": "Компаниялар",
    "header.registries": "Тізілімдер",
    "header.about": "Сервис туралы",
    "header.soon": "Жақында",
    "header.login": "Кіру",
    "header.register": "Тіркелу",
    "header.profile": "Жеке профиль",
    "header.logout": "Шығу",

    "home.seoTitle": "Қазақстан компанияларын БСН және атауы бойынша тексеру",
    "home.seoDescription":
      "Қазақстан компанияларын БСН және атауы бойынша тексеру: басшы, заңды мекенжай және қызмет түрі ашық мемлекеттік тізілімдер деректері бойынша.",

    "hero.badge": "ҚР мемлекеттік тізілімдерінің ашық деректері",
    "hero.titleStart": "Қазақстандағы кез келген компанияны",
    "hero.titleAccent": "1 минутта тексеріңіз",
    "hero.intro":
      "БСН, басшы, мекенжай, қызмет түрі — 10+ ресми мемлекеттік дереккөздің деректері бойынша",
    "hero.placeholder": "Компания атауын, БСН немесе ЖСН енгізіңіз",
    "hero.button": "Іздеу",
    "hero.try": "Көріңіз:",

    "summary.companies.value": "1,2 млн+",
    "summary.companies.label": "Базадағы компаниялар мен ЖК",
    "summary.sources.value": "10+",
    "summary.sources.label": "Ресми дереккөздер",
    "summary.history.value": "5 жыл",
    "summary.history.label": "Жинақталған хронология",
    "summary.indicators.value": "30+",
    "summary.indicators.label": "Талдау көрсеткіштері",

    "cities.title": "Қалалар бойынша кәсіпорындар",
    "cities.all": "Барлық елді мекендер",
    "cities.count": "кәсіпорын",
    "city.almaty": "Алматы",
    "city.astana": "Астана",
    "city.shymkent": "Шымкент",
    "city.aktau": "Ақтау",
    "city.atyrau": "Атырау",

    "tutorial.title": "Сервиспен қалай жұмыс істеу керек",
    "tutorial.step1.title": "БСН немесе атауын енгізіңіз",
    "tutorial.step1.text":
      "Іздеу кез келген сәйкестендіргіш бойынша жұмыс істейді — компания атауы, БСН, басшының ЖСН.",
    "tutorial.step2.title": "Компания карточкасын қараңыз",
    "tutorial.step2.text":
      "Басшы, заңды мекенжай, қызмет түрі және тіркелген күні — бір бетте.",
    "tutorial.step3.title": "Шешім қабылдаңыз",
    "tutorial.step3.text":
      "Мәміле жасамас бұрын серіктестің сенімділігін сервистен шықпай тексеріңіз.",

    "source.title": "Ресми дереккөздердің деректері",

    "footer.intro":
      "Қазақстан Республикасының ашық мемлекеттік деректері негізінде жасалған жоба.",
    "footer.service": "Сервис",
    "footer.companies": "Компаниялар",
    "footer.cities": "Қалалар",
    "footer.oked": "ЭҚЖЖ",
    "footer.about": "Біз туралы",
    "footer.contacts": "Байланыс",
    "footer.faq": "Жиі қойылатын сұрақтар",
    "footer.legal": "Құқықтық ақпарат",
    "footer.terms": "Келісім",
    "footer.privacy": "Деректер саясаты",
    "footer.rights": "© 2026 Реестр.kz — Барлық құқықтар қорғалған",
    "footer.basedOn": "Деректер ҚР ашық тізілімдеріне негізделген",
  },
};

Object.assign(translations.ru, dataMessages.ru, authMessages.ru);
Object.assign(translations.kk, dataMessages.kk, authMessages.kk);
