require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

/* ===================== CONFIG ===================== */
const REGISTER_CHANNEL_ID = "1501579466445422652";
const STAFF_CHANNEL_ID = "1501578418834112554";
const RESULT_CHANNEL_ID = "1501590299003064362";
const LOG_CHANNEL_ID = "1501628297056882820";

const STAFF_ROLE_1 = "1501576408663851088";
const STAFF_ROLE_2 = "1502157567428788414";
const MEMBER_ROLE = "1501576591145173184";
const DONO_ID = "616758567491600411";

const registros = new Map();           // Registros ativos
const aprovadosPendentes = new Map();

/* ===================== READY ===================== */
client.once("ready", async () => {
  console.log(`Bot online: ${client.user.tag}`);

  const comando = new SlashCommandBuilder()
    .setName("registro")
    .setDescription("Inicia o painel de registro da facção");

  await client.application.commands.create(comando);
  console.log("✅ Comando /registro registrado!");
});

/* ===================== FUNÇÃO DE LOG ===================== */
async function enviarLog(title, description, color = "Blue") {
  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

/* ===================== INTERACTIONS ===================== */
client.on("interactionCreate", async (interaction) => {

  // Comando /registro
  if (interaction.isCommand() && interaction.commandName === "registro") {
    if (interaction.user.id !== DONO_ID) {
      return interaction.reply({ content: "❌ Você não tem permissão.", ephemeral: true });
    }
    if (interaction.channel.id !== REGISTER_CHANNEL_ID) {
      return interaction.reply({ content: "❌ Use este comando no canal correto.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle("📋 Registro Facção")
      .setDescription("Clique no botão abaixo para iniciar seu registro.")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("iniciar_registro")
        .setLabel("Iniciar Registro")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // ==================== BOTÃO INICIAR REGISTRO ====================
  if (interaction.isButton() && interaction.customId === "iniciar_registro") {
    const user = interaction.user;

    // Proteção contra clique duplo / spam
    if (registros.has(user.id)) {
      return interaction.reply({ 
        content: "❌ Você já tem um registro aberto! Termine ou cancele o anterior.", 
        ephemeral: true 
      });
    }

    await interaction.deferReply({ ephemeral: true }); // ← Evita clique duplo

    try {
      const canal = await interaction.guild.channels.create({
        name: `registro-${user.username}`,
        type: ChannelType.GuildText,
        parent: null,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: STAFF_ROLE_1, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: STAFF_ROLE_2, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const registro = {
        etapa: 0,
        respostas: [],
        canalId: canal.id,
        user: user,
        timeout: null
      };

      // Timeout de 10 horas
      registro.timeout = setTimeout(async () => {
        if (registros.has(user.id)) {
          const reg = registros.get(user.id);
          const ch = client.channels.cache.get(reg.canalId);
          if (ch) await ch.delete().catch(() => {});
          registros.delete(user.id);
          await enviarLog("⏰ Registro Expirado", 
            `<@${user.id}> não respondeu em 10 horas. Canal fechado automaticamente.`, "Red");
        }
      }, 10 * 60 * 60 * 1000);

      registros.set(user.id, registro);

      await interaction.editReply({ content: `✅ Canal de registro criado: ${canal}` });

      await enviarLog("📋 Novo Registro Iniciado", 
        `<@${user.id}> iniciou um registro.\nCanal: ${canal}`, "Blue");

      const welcome = `🏴 **A História da TDL – Tropa Da Leste**\n\n` +
        `A TDL (Tropa Da Leste) é mais do que uma simples família dentro do SAMP Underground... (seu texto completo)\n\n` +
        `Seja muito bem-vindo à **TDL – Tropa Da Leste**. Aqui, a união sempre vem em primeiro lugar. 🖤`;

      await canal.send(welcome);
      await canal.send("**Qual seu nome dentro do Underground?**");

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: "❌ Erro ao criar o canal. Tente novamente." });
    }
  }
});

/* ===================== PERGUNTAS ===================== */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const registro = registros.get(message.author.id);
  if (!registro || message.channel.id !== registro.canalId) return;

  // Reseta o timeout
  if (registro.timeout) {
    clearTimeout(registro.timeout);
    registro.timeout = setTimeout(async () => {
      if (registros.has(message.author.id)) {
        const reg = registros.get(message.author.id);
        const canal = client.channels.cache.get(reg.canalId);
        if (canal) await canal.delete().catch(() => {});
        registros.delete(message.author.id);
        await enviarLog("⏰ Registro Expirado", 
          `<@${message.author.id}> não respondeu em 10 horas. Canal fechado automaticamente.`, "Red");
      }
    }, 10 * 60 * 60 * 1000);
  }

  const respostas = registro.respostas;

  switch (registro.etapa) {
    case 0:
      respostas[0] = message.content;
      registro.etapa++;
      return message.channel.send("**Qual seu apelido para ser chamado dentro da facção?**");

    case 1:
      respostas[1] = message.content;
      registro.etapa++;
      return message.channel.send("**Qual seu número no Underground?** (Exemplo: `123654`)");

    case 2:
      if (!/^\d{1,6}$/.test(message.content)) {
        return message.channel.send("❌ Número inválido! Máximo 6 dígitos.\nTente novamente:");
      }
      respostas[2] = message.content;
      registro.etapa++;
      return message.channel.send("**Já participou de alguma facção ou família no SAMP ou Underground?** (sim ou não)");

    case 3:
      const resp = message.content.toLowerCase().trim();
      if (resp !== "sim" && resp !== "não") {
        return message.channel.send("❌ Responda apenas `sim` ou `não`:");
      }
      respostas[3] = resp;
      if (resp === "não") {
        respostas[4] = "0";
        registro.etapa = 5;
        return message.channel.send("**Qual o nome da pessoa que te recrutou?**");
      } else {
        registro.etapa++;
        return message.channel.send("**Quantas facções você já participou?** (Apenas números)");
      }

    case 4:
      if (!/^\d+$/.test(message.content)) {
        return message.channel.send("❌ Digite apenas números:");
      }
      respostas[4] = message.content;
      registro.etapa++;
      return message.channel.send("**Qual o nome da pessoa que te recrutou?**");

    case 5:
      respostas[5] = message.content;
      registro.etapa++;

      const confirmEmbed = new EmbedBuilder()
        .setTitle("✅ Confirmação de Registro")
        .setColor("Blue")
        .setDescription("Confira suas respostas antes de enviar:")
        .addFields(
          { name: "Nome no Underground", value: respostas[0] },
          { name: "Apelido", value: respostas[1] },
          { name: "Número", value: respostas[2] },
          { name: "Já participou?", value: respostas[3] },
          { name: "Quantas facções?", value: respostas[4] || "0" },
          { name: "Recrutador", value: respostas[5] }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("enviar_registro").setLabel("Enviar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("cancelar_registro").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
      );

      return message.channel.send({ embeds: [confirmEmbed], components: [row] });
  }
});

/* ===================== BOTÕES ===================== */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;

  if (interaction.customId === "enviar_registro") {
    const registro = registros.get(userId);
    if (!registro) return;

    aprovadosPendentes.set(userId, {
      respostas: [...registro.respostas],
      apelido: registro.respostas[1]
    });

    const staffChannel = interaction.guild.channels.cache.get(STAFF_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("📋 Novo Registro - TDL")
      .setColor("Blue")
      .addFields(
        { name: "Usuário", value: `<@${userId}>` },
        { name: "Nome no Underground", value: registro.respostas[0] },
        { name: "Apelido", value: registro.respostas[1] },
        { name: "Número", value: registro.respostas[2] },
        { name: "Já participou?", value: registro.respostas[3] },
        { name: "Quantas facções?", value: registro.respostas[4] || "0" },
        { name: "Recrutador", value: registro.respostas[5] }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${userId}`).setLabel("Aprovar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${userId}`).setLabel("Recusar").setStyle(ButtonStyle.Danger)
    );

    await staffChannel.send({ embeds: [embed], components: [row] });

    await interaction.reply({ content: "✅ Registro enviado para a staff!", ephemeral: true });

    await enviarLog("📨 Registro Enviado", 
      `<@${userId}> enviou o registro para análise.\nApelido: **${registro.respostas[1]}**`, "Orange");

    if (registro.timeout) clearTimeout(registro.timeout);
    registros.delete(userId);
  }

  if (interaction.customId === "cancelar_registro") {
    const registro = registros.get(userId);
    if (registro && registro.timeout) clearTimeout(registro.timeout);
    await interaction.channel.delete().catch(() => {});
    registros.delete(userId);
    await enviarLog("❌ Registro Cancelado", `<@${userId}> cancelou o registro.`, "Red");
  }

  // APROVAR
  if (interaction.customId.startsWith("aprovar_")) {
    const targetId = interaction.customId.split("_")[1];
    const membro = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!membro) return interaction.reply({ content: "Usuário não encontrado.", ephemeral: true });

    const data = aprovadosPendentes.get(targetId);
    const apelido = data ? data.apelido : membro.user.username;

    await membro.setNickname(apelido).catch(() => {});
    await membro.roles.add(MEMBER_ROLE).catch(() => {});

    const resultChannel = interaction.guild.channels.cache.get(RESULT_CHANNEL_ID);
    await resultChannel.send(`🎉 | Olá <@${targetId}>, seu registro foi **APROVADO**!\nSeja bem-vindo à **TDL**!`);

    await interaction.reply({ content: `✅ ${membro.user.tag} aprovado! Apelido: **${apelido}**`, ephemeral: true });

    await enviarLog("✅ Registro Aprovado", 
      `Usuário: <@${targetId}>\nApelido aplicado: **${apelido}**\nAprovado por: <@${interaction.user.id}>`, "Green");

    aprovadosPendentes.delete(targetId);
  }

  // RECUSAR
  if (interaction.customId.startsWith("recusar_")) {
    const targetId = interaction.customId.split("_")[1];
    const resultChannel = interaction.guild.channels.cache.get(RESULT_CHANNEL_ID);
    
    await resultChannel.send(`❌ | Olá <@${targetId}>, seu registro foi **RECUSADO**.\nNão desanime. Revise melhor os detalhes e tente novamente futuramente.`);

    await interaction.reply({ content: `❌ Registro recusado.`, ephemeral: true });

    await enviarLog("❌ Registro Recusado", 
      `Usuário: <@${targetId}>\nRecusado por: <@${interaction.user.id}>`, "Red");

    aprovadosPendentes.delete(targetId);
  }
});

client.login(process.env.TOKEN);