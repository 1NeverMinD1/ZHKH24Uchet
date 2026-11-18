import { dataMessages } from "./messagesData";
import { authMessages } from "./messagesAuth";
import { directorMessages } from "./messagesDirector";
import { historyMessages } from "./messagesHistory";

export const translations = {
  ru: {
    "header.menu": "Меню",
    "header.companies": "Компании",
    "header.stats": "Статистика",
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
    "footer.rights": "© 2026 Bindex — Все права защищены",
    "unit.nowTitle": "Сейчас в помещении",
    "unit.pastTitle": "Ранее были в помещении",
    "unit.nowEmpty": "Сейчас в помещении нет компаний",
    "director.nowTitle": "Сейчас руководит",
    "director.pastTitle": "Ранее руководил",
    "director.nowEmpty": "Сейчас не руководит ни одной компанией",
    "address.searchPlaceholder": "Номер квартиры или офиса",
    "address.unitsNotFound": "Помещений не найдено",
    "address.companySearchPlaceholder": "Название компании или БИН",
    "address.companySearchButton": "Найти",
    "search.formerName": "Ранее: {name}",
    "filters.toggle": "Фильтры",
    "hero.badgeData": "Открытые данные Бюро национальной статистики",
    "hero.introData":
      "БИН, руководитель, адрес, вид деятельности и история изменений с 2018 года. Данные реестра юридических лиц, обновление каждый месяц.",
    "hero.placeholderBin": "Название компании или БИН",
    "summary.active": "действующих компаний",
    "summary.appeared": "новых за последний месяц",
    "summary.changed": "изменились за последний месяц",
    "summary.since": "год начала истории изменений",
    "regions.title": "Компании по регионам",
    "regions.all": "Вся статистика",
    "regions.count": "{count} компаний",
    "howto.title": "Как пользоваться",
    "howto.step1.title": "Найдите компанию",
    "howto.step1.text":
      "Введите название или БИН. Поиск понимает старые названия и написание на русском, казахском и латиницей.",
    "howto.step2.title": "Откройте карточку",
    "howto.step2.text":
      "Реквизиты, руководитель, адрес, виды деятельности и история их изменений по месяцам.",
    "howto.step3.title": "Следите за изменениями",
    "howto.step3.text":
      "Фильтры по региону, отрасли и размеру, списки компаний, где сменились руководитель, адрес или название.",
    "datasource.title": "Откуда данные",
    "datasource.name": "Бюро национальной статистики",
    "datasource.text":
      "Реестр юридических лиц, филиалов и представительств Республики Казахстан. Ежемесячные срезы с января 2018 года.",
    "datasource.updated": "Последнее обновление: {date}",
    "footer.basedOn": "Данные основаны на открытых реестрах РК",
  },
  kk: {
    "header.menu": "Мәзір",
    "header.companies": "Компаниялар",
    "header.stats": "Статистика",
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
    "footer.rights": "© 2026 Bindex — Барлық құқықтар қорғалған",
    "unit.nowTitle": "Қазір осы үй-жайда",
    "unit.pastTitle": "Бұрын осы үй-жайда болған",
    "unit.nowEmpty": "Қазір үй-жайда компаниялар жоқ",
    "director.nowTitle": "Қазір басқарады",
    "director.pastTitle": "Бұрын басқарған",
    "director.nowEmpty": "Қазір ешбір компанияны басқармайды",
    "address.searchPlaceholder": "Пәтер немесе кеңсе нөмірі",
    "address.unitsNotFound": "Үй-жайлар табылмады",
    "address.companySearchPlaceholder": "Компания атауы немесе БСН",
    "address.companySearchButton": "Іздеу",
    "search.formerName": "Бұрын: {name}",
    "filters.toggle": "Сүзгілер",
    "hero.badgeData": "Ұлттық статистика бюросының ашық деректері",
    "hero.introData":
      "БСН, басшы, мекенжай, қызмет түрі және 2018 жылдан бергі өзгерістер тарихы. Заңды тұлғалар тізілімінің деректері, ай сайын жаңартылады.",
    "hero.placeholderBin": "Компания атауы немесе БСН",
    "summary.active": "жұмыс істеп тұрған компания",
    "summary.appeared": "соңғы айда жаңадан пайда болған",
    "summary.changed": "соңғы айда өзгерген",
    "summary.since": "өзгерістер тарихы басталған жыл",
    "regions.title": "Өңірлер бойынша компаниялар",
    "regions.all": "Барлық статистика",
    "regions.count": "{count} компания",
    "howto.title": "Қалай пайдалану керек",
    "howto.step1.title": "Компанияны табыңыз",
    "howto.step1.text":
      "Атауын немесе БСН енгізіңіз. Іздеу бұрынғы атауларды және орыс, қазақ, латын әріптерімен жазылуын түсінеді.",
    "howto.step2.title": "Карточкасын ашыңыз",
    "howto.step2.text":
      "Деректемелер, басшы, мекенжай, қызмет түрлері және олардың айлар бойынша өзгерістер тарихы.",
    "howto.step3.title": "Өзгерістерді бақылаңыз",
    "howto.step3.text":
      "Өңір, сала және көлем бойынша сүзгілер, басшысы, мекенжайы немесе атауы өзгерген компаниялар тізімі.",
    "datasource.title": "Деректер қайдан алынады",
    "datasource.name": "Ұлттық статистика бюросы",
    "datasource.text":
      "Қазақстан Республикасының заңды тұлғалары, филиалдары мен өкілдіктерінің тізілімі. 2018 жылғы қаңтардан бастап ай сайынғы деректер.",
    "datasource.updated": "Соңғы жаңарту: {date}",
    "footer.basedOn": "Деректер ҚР ашық тізілімдеріне негізделген",
  },
};

Object.assign(
  translations.ru,
  dataMessages.ru,
  authMessages.ru,
  historyMessages.ru,
  directorMessages.ru,
);
Object.assign(
  translations.kk,
  dataMessages.kk,
  authMessages.kk,
  historyMessages.kk,
  directorMessages.kk,
);
