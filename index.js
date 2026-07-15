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

const STAFF_ROLE_1 = "1501576408663851088";
const STAFF_ROLE_2 = "1502157567428788414";
const MEMBER_ROLE = "1501576591145173184";
const DONO_ID = "616758567491600411";

const registros = new Map();

/* ===================== READY ===================== */
client.once("ready", async () => {
  console.log(`Bot online: ${client.user.tag}`);

  const comando = new SlashCommandBuilder()
    .setName("registro")
    .setDescription("Inicia o painel de registro da facção");

  await client.application.commands.create(comando);
  console.log("✅ Comando /registro registrado!");
});

/* ===================== INTERACTIONS ===================== */
client.on("interactionCreate", async (interaction) => {

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

  if (interaction.isButton() && interaction.customId === "iniciar_registro") {
    const user = interaction.user;

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

    registros.set(user.id, {
      etapa: 0,
      respostas: [],
      canalId: canal.id,
      user: user
    });

    await interaction.reply({ content: `✅ Canal de registro criado: ${canal}`, ephemeral: true });

    // NOVO TEXTO DE BOAS-VINDAS
    const welcome = `🏴 **A História da TDL – Tropa Da Leste**\n\n` +
      `A TDL (Tropa Da Leste) é mais do que uma simples família dentro do SAMP Underground. Somos uma comunidade construída sobre lealdade, respeito, união, comprometimento e confiança.\n\n` +
      `Nossa história começou há muito tempo, quando éramos conhecidos como Dark Thunder. Naquela época, conquistamos nosso espaço e escrevemos uma das páginas mais marcantes do Underground. Com muito esforço e dedicação de todos os membros, chegamos a reunir mais de 80 integrantes ativos, tornando-nos uma das famílias mais fortes e respeitadas do servidor.\n\n` +
      `Esse período aconteceu quando o Underground havia acabado de completar 1 ano de existência e alcançava cerca de 700 jogadores online diariamente. Foram tempos de grandes batalhas, amizades, conquistas e momentos que marcaram todos que fizeram parte da nossa trajetória.\n\n` +
      `Com o passar dos anos, muita coisa mudou. Alguns seguiram novos caminhos, outros permaneceram, mas a essência da nossa família nunca desapareceu.\n\n` +
      `Hoje retornamos com nossa identidade definitiva: **TDL – Tropa Da Leste**.\n\n` +
      `Nosso objetivo não é sermos apenas a maior família do servidor, mas sim construir uma família formada por pessoas leais, ativas, respeitosas, comprometidas, organizadas e dispostas a crescer juntas.\n\n` +
      `Estamos escrevendo um novo capítulo da nossa história, e queremos que você faça parte dele.\n\n` +
      `Seja muito bem-vindo à **TDL – Tropa Da Leste**. Aqui, a união sempre vem em primeiro lugar. 🖤`;

    await canal.send(welcome);
    await canal.send("**Qual seu nome dentro do Underground?**");
  }
});

/* ===================== PERGUNTAS ===================== */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const registro = registros.get(message.author.id);
  if (!registro || message.channel.id !== registro.canalId) return;

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
  const registro = registros.get(userId);

  if (interaction.customId === "enviar_registro" && registro) {
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

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
      registros.delete(userId);
    }, 15000);
  }

  if (interaction.customId === "cancelar_registro") {
    await interaction.channel.delete().catch(() => {});
    registros.delete(userId);
  }

  // Aprovar
  if (interaction.customId.startsWith("aprovar_")) {
    const targetId = interaction.customId.split("_")[1];
    const membro = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!membro) return interaction.reply({ content: "Usuário não encontrado.", ephemeral: true });

    const reg = registros.get(targetId) || { respostas: [] };

    await membro.setNickname(reg.respostas[1] || membro.user.username).catch(() => {});
    await membro.roles.add(MEMBER_ROLE).catch(() => {});

    const resultChannel = interaction.guild.channels.cache.get(RESULT_CHANNEL_ID);
    await resultChannel.send(`🎉 | Olá <@${targetId}>, seu registro foi **APROVADO**!\nSeja bem-vindo à **TDL**!`);

    await interaction.reply({ content: `✅ ${membro.user.tag} aprovado com sucesso!`, ephemeral: true });
  }

  // Recusar
  if (interaction.customId.startsWith("recusar_")) {
    const targetId = interaction.customId.split("_")[1];
    const resultChannel = interaction.guild.channels.cache.get(RESULT_CHANNEL_ID);
    await resultChannel.send(`❌ | Olá <@${targetId}>, seu registro foi **RECUSADO**.\nNão desanime. Revise melhor os detalhes e tente novamente futuramente.`);

    await interaction.reply({ content: `❌ Registro recusado.`, ephemeral: true });
  }
});

client.login(process.env.TOKEN);