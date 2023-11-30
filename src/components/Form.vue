<script setup lang="ts">
import {
  ITable,
  IFieldMeta,
  INumberField,
  IDateTimeField,
  FieldType,
  ITextField,
  IEventCbCtx,
  Selection,
} from "@lark-base-open/js-sdk";
import { bitable } from "@lark-base-open/js-sdk";
import { ref, onMounted, shallowRef, computed, reactive } from "vue";
import { i18n } from "../locales/i18n";
import { ElMessage } from "element-plus";
import { WarningFilled, CaretBottom } from "@element-plus/icons-vue";
// import { syntaxReferenceList } from "./Form";
const { t } = i18n.global;

/** 页面加载数据 */
const isTransformed = ref(false);
const sucessCounter = ref(0);
const failureCounter = ref(0);
const stopFlag = ref(false);
const finishFlag = ref(false);
const recordCount = ref(0);
const isLoading = ref(false);

/** 页面数据 */
const regexText = ref("");
const modifierText = ref("");
const activeTable = shallowRef<ITable>();
const fieldList = shallowRef<IFieldMeta[]>([]);
const activeTableName = ref("");
const activeTableId = ref("");
const errorMsg = ref("");
const replaceText = ref("");
const originField = shallowRef<IFieldMeta>();
const targetField = shallowRef<IFieldMeta>();

const activeTransformPattern = ref({
  label: "",
  value: "",
});
const activeUnit = ref({
  label: "",
  value: "",
});
const activeModifier = ref<any[]>([]);
const transformPatternList = computed(() => {
  return [
    {
      label: t("mode.test"),
      value: "test",
      desc: t("mode.testDesc"),
    },
    {
      label: t("mode.match"),
      value: "match",
      desc: t("mode.matchDesc"),
    },
    {
      label: t("mode.replace"),
      value: "replace",
      desc: t("mode.replaceDesc"),
    },
    {
      label: t("mode.split"),
      value: "split",
      desc: t("mode.splitDesc"),
    },
  ];
});
const modifierList = computed(() => {
  return [
    {
      label: t("modifier.global"),
      value: "g",
    },
    {
      label: t("modifier.ignoreCase"),
      value: "i",
    },
    {
      label: t("modifier.multiLine"),
      value: "m",
    },
    {
      label: t("modifier.newline"),
      value: "s",
    },
  ];
});
activeModifier.value[0] = modifierList.value[0]["value"];

const sampleList = computed(() => {
  return [
    {
      label: t("sample.extractPhoneNumber"),
      value: "extractPhoneNumber",
      regex: "",
    },
    {
      label: t("sample.IdCard"),
      value: "IdCard",
      regex: "",
    },
    {
      label: t("sample.PostalCode"),
      value: "PostalCode",
      regex: "",
    },
    // {
    //   label: t("sample.IPAddress"),
    //   value: "IPAddress",
    //   regex: ""
    // },
  ];
});
const syntaxReferenceList = computed(() => {
  return i18n.global.tm("syntaxReferenceList")
})

/**
 * 处理单位变化的函数
 */
const handleUnitChange = (): void => {
  // originField.value = undefined; // 重置原字段的值为undefined
  // targetField.value = undefined; // 重置目标字段的值为undefined
};

const handleModifierChange = (): void => {
  modifierText.value = activeModifier.value.join("");
};

/**
 * 重置页面信息
 */
const handleReset = (): void => {
  errorMsg.value = "";
  isTransformed.value = true;
  isLoading.value = true;
  stopFlag.value = false;
  finishFlag.value = false;
  sucessCounter.value = 0;
  recordCount.value = 0;
  failureCounter.value = 0;
};

/**
 * 提取字段值
 * @param selectedField 源字段
 * @param recordId 记录Id
 */
const extractValueByRecordId = async (
  selectedField: SupportField,
  recordId: string
): Promise<string | null> => {
  const originFieldVar = await selectedField.getValue(recordId);
  if (originFieldVar === null) {
    return null;
  }
  let res: string | null = null;
  // 本身是 IDateTimeField || INumberField 类型
  if (originField.value?.type === FieldType.Number) {
    res = originFieldVar.toString();
  } else if (originField.value?.type === FieldType.Text) {
    // 本身是 ITextField 类型
    if (Array.isArray(originFieldVar) && originFieldVar[0].type == "text") {
      if (modifierText.value.includes("m")) {
        res = originFieldVar.map((object) => object.text).join("");
      } else {
        res = originFieldVar[0].text;
      }
      console.log("res ", res);
    }
  }
  return res;
};

/**
 * 设置字段值
 * @param targetSelectField 目标字段
 * @param recordId 记录Id
 * @param targetVal 目标值
 */
const setValueByRecordId = async (
  targetSelectField: ITextField,
  recordId: string,
  targetVal: string
): Promise<void> => {
  let res: Promise<void>;
  if (targetField.value?.type === FieldType.Text) {
    res = (targetSelectField as ITextField)
      .setValue(recordId, targetVal.toString())
      .then(() => {
        sucessCounter.value++;
      })
      .catch(() => {
        failureCounter.value++;
      });
  } else {
    return;
  }

  return res;
};

/**
 * 验证表单
 */
const fomrValidate = () => {
  // 源字段和目标字段都为空
  if (!(originField.value && targetField.value)) {
    return t("message.emptyField");
  }
  // 转换模式为空
  if (!activeTransformPattern.value.value.length) {
    return t("message.emptyMode");
  }
  // 正则表达式文本为空
  if (!regexText.value.length) {
    return t("message.emptyRegex");
  }
  // 正则表达式无效
  if (!isRegexValid(regexText.value)) {
    return t("message.wrongRegex");
  }
  // 验证通过
  return null;
};

/**
 * 提交转换
 */
const handleConfirm = async () => {
  const msg = fomrValidate(); // 执行表单验证

  if (msg) {
    errorMsg.value = msg; // 如果有错误信息，设置错误信息
    return;
  }

  handleReset(); // 清空表单数据

  if (activeTable.value) {
    const recordIdList = await activeTable.value.getRecordIdList(); // 获取所有记录ID列表
    const originSelectField = await activeTable.value.getField<SupportField>(
      originField.value!.id
    ); // 获取原始字段
    const targetSelectField = await activeTable.value.getField<ITextField>(
      targetField.value!.id
    ); // 获取目标字段

    try {
      const promises: Promise<void>[] = [];

      // 遍历记录ID列表
      for (const recordId of recordIdList) {
        const val = await extractValueByRecordId(originSelectField, recordId); // 提取记录ID对应原始字段的值
        if (!val) {
          continue; // 如果值为空则继续下一次循环
        }

        recordCount.value++; // 记录转换的记录数
        if (!stopFlag.value) {
          const rplcTxt = replaceText.value; // 获取替换文本
          let targetVal = regexTranform(val, regexText.value, rplcTxt); // 正则转换值
          if (targetVal != undefined) {
            const proimse = setValueByRecordId(
              targetSelectField,
              recordId,
              targetVal
            ); // 设置记录ID对应目标字段的值
            promises.push(proimse); // 将Promise添加到promises数组中
          }
        }
      }

      await Promise.all(promises); // 等待所有Promise完成
    } finally {
      isLoading.value = false; // 设置加载状态为false
      if (!stopFlag.value && recordCount.value === sucessCounter.value) {
        finishFlag.value = true; // 如果没有停止标志且记录数等于成功计数器的值，则设置完成标志为true
      }
    }
  }
};

/**
 * 转换模版
 * @param mode 模式
 */
const handleClickSample = (mode: string) => {
  const regexes = {
    number: "[0-9]+",
    alpha: "[a-z]+",
    phoneNumber: "^1[0-9]{10}$",
    chinese: `[\\u4e00-\\u9fff]+`,
    extractPhoneNumber: "1[0-9]{10}",
    IdCard: `^[1-9]\\d{5}(18|19|20)\\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\\d{3}[0-9Xx]$`,
    PostalCode: `^[1-9]\\d{5}$`,
    IPAddress: `^((2[0-4]\\d|25[0-5]|[01]?\\d\\d?)\\.){3}(2[0-4]\\d|25[0-5]|[01]?\\d\\d?)$`,
  };
  regexText.value = regexes[mode];
};

/**
 *
 * @param originFieldText 源字段文本
 * @param regexExpression 正则表达式
 */
const regexTranform = (
  originFieldText: string,
  regexExpression: string,
  replaceText: string
) => {
  let regex: RegExp;
  if (modifierText.value.length) {
    regex = new RegExp(regexExpression, modifierText.value);
  } else {
    regex = new RegExp(regexExpression);
  }
  if (activeTransformPattern.value.value == "test") {
    console.log(regex);
    return regex.test(originFieldText) ? t("res.true") : t("res.false");
  }
  if (activeTransformPattern.value.value == "match") {
    const matches = originFieldText.match(regex);
    console.log(matches);
    return matches ? matches.join(" ") : "";
  }
  if (activeTransformPattern.value.value == "replace") {
    return originFieldText.replace(regex, replaceText);
  }
  if (activeTransformPattern.value.value == "split") {
    return originFieldText.split(regex).join(" ");
  }
};

/**
 * 停止转换
 */
const handleStop = () => {
  if (finishFlag.value) {
    return;
  }
  isLoading.value = false;
  stopFlag.value = true;
};

/**
 * 验证用户输入的字符串是否是合法的正则表达式
 * @param pattern 用户输入的字符串
 */
const isRegexValid = (pattern: string) => {
  try {
    new RegExp(pattern);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 获取当前选中的表信息
 */
const getCurrentSelection = async () => {
  const selection = await bitable.base.getSelection();
  if (selection.tableId && selection.viewId) {
    activeTable.value = await bitable.base.getTableById(selection.tableId);
    activeTableId.value = activeTable.value.id;
    activeTableName.value = await activeTable.value.getName();
    const view = await activeTable.value.getViewById(selection.viewId);
    fieldList.value = await view.getFieldMetaList();
  }
};

/**
 * 字段变化时触发
 */
const handleFieldChange = () => {
  console.log("handleFieldChange");
  getCurrentSelection();
  originField.value = undefined;
  targetField.value = undefined;
};

/**
 * 选择变化时触发
 * 仅处理table变化时
 */
const handleSelectionChange = (e: IEventCbCtx<Selection>) => {
  if (e.data.tableId != activeTableId.value) {
    handleFieldChange();
  }
};

/**
 * 组件挂载时触发
 */
onMounted(async () => {
  await getCurrentSelection();
  // 注册选择变化监听器
  const off = bitable.base.onSelectionChange(handleSelectionChange);
  // 注册字段修改监听器
  const offFieldModify = activeTable.value?.onFieldModify(handleFieldChange);
  // 注册字段添加监听器
  const offFieldAdd = activeTable.value?.onFieldAdd(handleFieldChange);
  // 注册字段删除监听器
  const offFieldDelete = activeTable.value?.onFieldDelete(handleFieldChange);
});

type SupportField = ITextField | IDateTimeField | INumberField;
</script>

<template>
  <div style="margin-bottom: 15px">
    <div>
      <el-alert show-icon type="info">
        <template #title>
          {{ t("info.guideDesc") }}
          <a :href="t(`info.url`)" target="_blank">{{ t(`info.guide`) }}</a>
        </template>
      </el-alert>
    </div>
  </div>
  <div style="padding-bottom: 10px">
    <el-form label-position="top">
      <el-row
        style="
          display: flex;
          align-items: center;
          padding-bottom: 15px;
          font-size: large;
        "
      >
        {{ t("form.currentTable") }}
        <el-tag
          type="success"
          effect="dark"
          size="medium"
          style="margin-left: 10px"
        >
          {{ activeTableName }}
        </el-tag>
      </el-row>
      <div>
        <el-form-item>
          <template #label>
            <span style="display: flex; align-items: center">
              {{ t(`form.chooseOriginField`) }}
              <el-tooltip
                class="box-item"
                effect="dark"
                :content="t(`info.originField`)"
                placement="right"
              >
                <el-icon><WarningFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-select
            v-model="originField"
            value-key="id"
            class="m-2"
            :placeholder="t(`form.chooseOriginField`)"
            style="width: 100%; border-radius: 10px"
          >
            <el-option
              v-for="item in fieldList.filter(
                (item) => item.type === 1 || item.type === 2
              )"
              :key="item.id"
              :label="item.name"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <template #label>
            <span style="display: flex; align-items: center">
              {{ t(`form.chooseTargetField`) }}
              <el-tooltip
                class="box-item"
                effect="dark"
                :content="t(`info.targetField`)"
                placement="right"
              >
                <el-icon><WarningFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-select
            v-model="targetField"
            value-key="id"
            class="m-2"
            :placeholder="t(`form.chooseTargetField`)"
            style="width: 100%"
          >
            <el-option
              v-for="item in fieldList.filter((item) => item.type === 1)"
              :key="item.id"
              :label="item.name"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-row style="width: 100%; justify-content: space-between">
          <el-col :span="9">
            <el-form-item :label="t(`form.chooseSelectMode`)">
              <el-select
                v-model="activeTransformPattern"
                value-key="value"
                class="m-2"
                :placeholder="t(`form.chooseSelectMode`)"
                :change="handleUnitChange()"
                style="width: 100%"
              >
                <el-option
                  v-for="item in transformPatternList"
                  :key="item.value"
                  :label="item.label"
                  :value="item"
                >
                  <span style="float: left">{{ item.label }}</span>
                  <span
                    style="
                      margin-left: 20px;
                      color: var(--el-text-color-secondary);
                      font-size: 13px;
                    "
                    >{{ item.desc }}</span
                  >
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="14">
            <el-form-item :label="t(`form.modifier`)">
              <el-select
                v-model="activeModifier"
                multiple
                collapse-tags
                value-key="value"
                class="m-2"
                :placeholder="t(`form.modifier`)"
                :change="handleModifierChange()"
                style="width: 100%"
              >
                <el-option
                  v-for="item in modifierList"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="t(`form.inputRegexText`)">
          <el-input
            v-model="regexText"
            :placeholder="t(`form.inputRegexText`)"
            clearable
            style="width: 100%"
          >
            <template #prepend>
              <span> / </span>
            </template>
            <template #append>
              <span> /{{ modifierText }} </span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item
          v-if="activeTransformPattern.value == `replace`"
          :label="t(`form.inputReplaceText`)"
        >
          <el-input
            v-model="replaceText"
            :placeholder="t(`form.inputReplaceText`)"
            clearable
            style="width: 100%"
          >
          </el-input>
        </el-form-item>
      </div>
    </el-form>
    <div class="tag-row">
      <el-tag
        class="ml-2 clickable tag"
        type=""
        @click="handleClickSample(`number`)"
        >{{ t("sample.number") }}</el-tag
      >
      <el-tag
        class="ml-2 clickable tag"
        type="warning"
        @click="handleClickSample(`alpha`)"
        >{{ t("sample.aplpha") }}</el-tag
      >
      <el-tag
        class="ml-2 clickable tag"
        type="success"
        @click="handleClickSample(`phoneNumber`)"
        >{{ t("sample.phoneNumber") }}</el-tag
      >
      <el-popover :width="150" :hide-after="0" trigger="click">
        <template #reference>
          <el-tag class="ml-2 clickable tag" effect="plain" type="info">{{
            t("status.more")
          }}</el-tag>
        </template>
        <el-row
          v-for="item in sampleList"
          style="justify-content: center; padding-bottom: 5px"
        >
          <el-tag
            class="ml-2 clickable tag"
            type=""
            effect="plain"
            @click="handleClickSample(item.value)"
            >{{ item.label }}</el-tag
          >
        </el-row>
      </el-popover>
    </div>
    <el-col :span="24"> </el-col>
    <div>
      <el-button type="primary" :disabled="isLoading" @click="handleConfirm">
        {{ isLoading ? t("status.transforming") : t("status.confirm") }}
      </el-button>
      <el-button @click="handleStop"> {{ t("status.stop") }} </el-button>
      <el-tooltip
        placement="bottom"
        effect="light"
        trigger="click"
        :hide-after="0"
      >
        <template #content>
          <div v-for="item in syntaxReferenceList">
            <span style="color: #337ecc; font-weight: bolder">
              {{ item.syntax }}
            </span>
            <span style="margin-left: 10px">
              {{ item.desc }}
            </span>
          </div>
          <el-row style="background-color: #e9e9eb">
            {{ t(`moreRef`) }}
            <a :href="t(`info.url`)" target="_blank">{{ t(`info.guide`) }}</a>
          </el-row>
        </template>
        <el-button type="primary" plain>
          {{ t(`grammarRef`) }}
          <el-icon><CaretBottom /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
    <div
      v-if="errorMsg"
      style="padding-top: 20px; font-size: medium; width: 100%"
    >
      <el-alert :title="errorMsg" type="error" show-icon :closable="false" />
    </div>
    <div v-if="isTransformed" style="padding-top: 20px; font-size: medium">
      <div style="padding-bottom: 10px">
        <div style="padding-bottom: 10px">
          {{ t("status.succeeded") + sucessCounter }}
        </div>
        <div style="padding-bottom: 10px">
          {{ t("status.failed") + failureCounter }}
          <span v-if="failureCounter">
            {{ t("status.checkOriginField") }}
          </span>
        </div>
        <div v-if="finishFlag && !stopFlag" style="padding-bottom: 10px">
          <el-tag v-if="sucessCounter" type="primary" size="large">
            {{ t("status.completeTag") }}
          </el-tag>
          <el-tag v-else type="warning" size="large">
            {{ t("status.failTag") }}
          </el-tag>
        </div>
        <div v-if="stopFlag" style="padding-bottom: 10px">
          <el-tag type="info" size="large">
            {{ t("status.stopTag") }}
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form :deep(.el-form-item__label) {
  font-size: 16px;
  color: var(--el-text-color-primary);
  margin-bottom: 0;
}
.form :deep(.el-form-item__content) {
  font-size: 16px;
}
.modeSelect :deep(.el-input__inner) {
  font-weight: bold;
}
:deep(.el-form-item__label) {
  font-size: medium;
  font-weight: medium;
}
:deep(.el-card__body) {
  padding-left: 0px;
  padding-right: 0px;
  /* margin-top: 10px; */
}
:deep(.el-input-group__prepend) {
  padding-top: 0px;
  padding-right: 5px;
  padding-bottom: 0px;
  padding-left: 5px;
}
:deep(.el-input-group__append) {
  padding-top: 0px;
  padding-right: 5px;
  padding-bottom: 0px;
  padding-left: 5px;
}
.card-header {
  display: flex;
  margin-left: -10px;
  margin-right: -10px;
  justify-content: space-between;
  align-items: center;
}

.text {
  font-size: 14px;
}

.item {
  margin-bottom: 18px;
}
.expand-icon :hover {
  cursor: pointer;
}
.clickable :hover {
  cursor: pointer;
}
.tag {
  margin-right: 5px;
}
.tag-row {
  width: 100%;
  padding-bottom: 15px;
  justify-content: left;
  display: flex;
  flex-wrap: wrap;
  row-gap: 5px;
}
</style>
