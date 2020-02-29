const Telegraf = require("telegraf");
const { Markup } = require("telegraf");
const bot = new Telegraf("1016914729:AAGYhE9fOB0BEkopWCVQaqG-LZRBlzSQlGw");
const axios = require("axios");
var date_validator = require("DateValidator").DateValidator;
var timeRegex = new RegExp(
  "^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]) (0|['+'|'-'][1-9]|['+'|'-']1[0-2])$"
);

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function isValidDate(year, month, day) {
  return date_validator.validate(year, month, day);
}

function isValidHour(str) {
  return timeRegex.test(str);
}

let state = {};
const URL = "http://localhost:8080/api/";

function getCurrentReminders() {
  var reminders = [];
  axios
    .get(URL + "reminders")
    .then((res) => {
      res.data.map((e) => {
        const today = new Date();
        const date = new Date(e.remind_date);
        if (
          date.getDate() == today.getDate() &&
          date.getMonth() == today.getMonth() &&
          date.getYear() == today.getYear() &&
          date.getMinutes() == today.getMinutes() &&
          date.getHours() == today.getHours()
        ) {
          reminders.push(e);
        }
      });
    })
    .then(() => {
      reminders.forEach((e) => {
        bot.telegram.sendMessage(
          e.chat_id,
          "Hi " + e.firstname + ", it is time to " + e.description
        );
        axios.delete(URL + "reminder/" + e.id).then((res) => {
  
        });
      });
    });
}

function noDelaySetInterval(func, interval) {
  getCurrentReminders();
  return setInterval(getCurrentReminders, 10 * 1000);
}

noDelaySetInterval();

function updatingState(userId, command) {
  state[userId].userId = userId;
  state[userId].command = command;
}

bot.command("addreminder", (ctx) => {
  userId = ctx.message.from.id;
  if (!state[userId]) state[userId] = {};
  var firstName = ctx.message.chat.first_name;
  updatingState(ctx.message.from.id, "add_new_reminder");
  var keyboardData = {
    header: "cancel",
    userId: userId
  };
  return ctx.reply(
    `Hello ${firstName}, what may I remind you?`,
    Markup.inlineKeyboard([
      Markup.callbackButton("Cancel", JSON.stringify(keyboardData))
    ]).extra()
  );
});

bot.command("showreminders", (ctx) => {
  var reminders = [];
  axios
    .get(URL + "user/" + ctx.message.from.id + "/reminders")
    .then((res) => {
      res.data.map((e) => {
        reminders.push(e);
      });
    })
    .then(() => {
      var str =
        "Hi " +
        ctx.message.from.first_name +
        ", this is your next reminders : \n";
      reminders.forEach((e) => {
        str += `\nDescription : ${e.description}\n`;
        str += `Date/Time   : ${e.remind_full_date}\n`;
      });
      ctx.reply(str);
    });
});

bot.command("updatereminder", (ctx) => {
  var reminders = [];
  var keyboards = [];
  axios
    .get(URL + "user/" + ctx.message.from.id + "/reminders")
    .then((res) => {
      res.data.map((e) => {
        keyboardData = {
          'header' : 'update',
          'r_id' : e.id
        }
        keyboards.push(
          Markup.callbackButton(
            `${e.description} - ${e.remind_full_date}`,
            JSON.stringify(keyboardData)
          )
        );
      });
    })
    .then(() => {
      if (keyboards.length > 0) {
        return ctx.reply(
          `Please choose which reminder you want to update.`,
          Markup.inlineKeyboard(keyboards).extra()
        );
      } else {
        return ctx.reply("Sorry, but you don't have any reminder.");
      }
    });
});

bot.command("about", (ctx) => {
  return ctx.reply(
    "This is a simple reminder bot made by Ari Davis (AA19-1), Junaedi Dede (JU19-1) and Alicia (LI19-1).\nThis is a research topic we decide to do in our study in Binus University"
  );
});

bot.on("text", (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.message.from.id;
  if (state[userId] && state[userId].command === "add_new_reminder") {
    gettingNewReminderDescription(userId, text, ctx, "add_new_reminder_date");
  } else if (
    state[userId] &&
    state[userId].command === "add_new_reminder_date"
  ) {
    gettingNewReminderDate(text, userId, ctx, "add_new_reminder_time");
  } else if (
    state[userId] &&
    state[userId].command === "add_new_reminder_time"
  ) {
    gettingNewReminderTime(text, userId, ctx, "add_new_reminder_accept_no");
  }
});

bot.on("callback_query", (ctx) => {
  data = JSON.parse(ctx.update.callback_query.data);
  firstName = ctx.update.callback_query.from.first_name;
  userId = ctx.update.callback_query.from.id;
  if (state[userId]) {
    if (data.header === "cancel") {
      state[userId] = null;
      return ctx.reply("Cancelled");
    } else if (data.header === "accept") {
      const newReminder = state[userId].newReminder;
      if (state[userId].newReminder.command === "add_new_reminder_accept_no") {
        addNewReminderAcceptReject(newReminder, ctx);
      }
    }

    else if(data.header === 'update'){
      console.log("meong")
      reminderId = data.r_id
      state[userId] = {};
      updatingState(userId, "add_new_reminder");
      var keyboardData = {
        header: "cancel",
        userId: userId
      };
      return ctx.reply(
        `Please tell me your new reminder description.`,
        Markup.inlineKeyboard([
          Markup.callbackButton("Cancel", JSON.stringify(keyboardData))
        ]).extra()
      );
    }
  }
});

bot.startPolling();
function gettingNewReminderTime(text, userId, ctx, command) {
  try {
    if (isValidHour(text)) {
      state[userId].newReminder.time.fullDate += ` ${text.substring(
        0,
        5
      )}:00 GMT${text.split(" ")[1]}`;
      var keyboardDataNo = {
        header: "cancel",
        userId: userId
      };
      var keyboardDataYes = {
        header: "accept",
        userId: userId
      };
      state[userId].newReminder.command = command;
      state[userId].newReminder.time.time = `${text.substring(0, 5)} GMT${
        text.split(" ")[1] != "0" ? text.split(" ")[1] : ""
      }`;
      ctx.reply(
        `Do you want me to remind you to ${
          state[userId].newReminder.description
        }\non ${state[userId].newReminder.time.year} ${
          monthNames[state[userId].newReminder.time.month - 1]
        } ${state[userId].newReminder.time.time}`,
        Markup.inlineKeyboard([
          Markup.callbackButton("Yes", JSON.stringify(keyboardDataYes)),
          Markup.callbackButton("No", JSON.stringify(keyboardDataNo))
        ]).extra()
      );
    } else {
      ctx.reply("Please insert a valid time!");
    }
  } catch {
    ctx.reply("Please insert a valid time!");
  }
}

function gettingNewReminderDate(text, userId, ctx, command) {
  var dates = text.split("-");
  try {
    if (
      isValidDate(parseInt(dates[0]), parseInt(dates[1]), parseInt(dates[2]))
    ) {
      state[userId].newReminder.time = {};
      state[userId].newReminder.time.year = parseInt(dates[0]);
      state[userId].newReminder.time.month = parseInt(dates[1]);
      state[userId].newReminder.time.date = parseInt(dates[2]);
      state[userId].newReminder.time.fullDate = text;
      updatingState(userId, command);
      var keyboardData = {
        header: "cancel",
        userId: userId
      };
      ctx.reply(
        `Next, what time?\nformat : hh:mm 0|+/-GMT\nex: 20:00 0 or 20:00 +7`,
        Markup.inlineKeyboard([
          Markup.callbackButton("Cancel", JSON.stringify(keyboardData))
        ]).extra()
      );
    } else {
      ctx.reply("Please insert a valid date!");
    }
  } catch (error) {
    ctx.reply("Please insert a valid date!");
  }
}

function gettingNewReminderDescription(userId, text, ctx, command) {
  state[userId].newReminder = {};
  state[userId].newReminder.description = text;
  updatingState(userId, command);
  var keyboardData = {
    header: "cancel",
    userId: userId
  };
  return ctx.reply(
    `Ok, which day do you want me to remind you to ${text}? format : yyyy-mm-dd`,
    Markup.inlineKeyboard([
      Markup.callbackButton("Cancel", JSON.stringify(keyboardData))
    ]).extra()
  );
}

function addNewReminderAcceptReject(newReminder, ctx) {
  postData = {
    description: newReminder.description,
    remind_date: new Date(
      `${newReminder.time.year}-${newReminder.time.month}-${newReminder.time.date} ${newReminder.time.time}`
    ).getTime(),
    remind_full_date: `${newReminder.time.year}-${newReminder.time.month}-${newReminder.time.date} ${newReminder.time.time}`,
    chat_id: ctx.update.callback_query.message.chat.id,
    user_id: userId,
    firstname: ctx.update.callback_query.from.first_name,
    lastname: ctx.update.callback_query.from.last_name
  };
  axios
    .post(URL + "reminders", postData, {
      headers: {
        "Content-Type": "application/json"
      }
    })
    .then((res) => {
      ctx.reply("Thank you, we will remind you on that time!");
      state[userId] = null;
    })
    .catch((error) => {
      ctx.reply("I'm sorry, but I'm waiting my creator to fix my bug.");
      state[userId] = null;
    });
}
